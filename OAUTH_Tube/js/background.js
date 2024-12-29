let requestDetailsMap = {}; // Mapa global para armazenar os detalhes das requisições
const server = "http://127.0.0.1:4474";
const filters_urls = [
  "https://www.youtube.com/youtubei/v1/log_event?alt=json",
  "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
  "https://www.youtube.com/youtubei/v1/next?prettyPrint=false"
]; // Filtros de URLs permitidas
const tabs_urls = [
  "https://www.youtube.com/",
  "https://www.youtube.com/playlist?list=",
  "https://www.youtube.com/watch?v="
]; // URLs a serem monitoradas nas abas

let apiConnectionAttempts = 0; // Contador para tentativas de conexão com a API
let extensionStarted = false; // Flag para verificar se a extensão foi ativada pelo usuário
let apiConnected = false; // Flag para verificar se a conexão com a API foi bem-sucedida

/**
 * Verifica se a URL corresponde a algum filtro.
 */
const isUrlFiltered = url => url && filters_urls.some(filter => url.startsWith(filter));

/**
 * Verifica se a URL corresponde a algum filtro de abas.
 */
const isTabUrlFiltered = url => url && tabs_urls.some(tabUrl => url.startsWith(tabUrl));

/**
 * Tentativa de conexão com a API para verificar se está disponível.
 */
const checkApiConnection = () => {
  console.log('%cTentando conectar à API...', 'color: blue; font-weight: bold;');

  fetch(`${server}/api/status`, { method: "GET" })
    .then(response => {
      if (response.ok) {
        apiConnected = true;
        console.log('%cConexão com a API bem-sucedida!', 'color: green; font-weight: bold;');
        extensionStarted = true; // A extensão pode iniciar após a conexão bem-sucedida
      } else {
        throw new Error("API não está respondendo corretamente.");
      }
    })
    .catch(err => {
      console.log(`%cFalha na conexão com a API: ${err.message}`, 'color: red; font-weight: bold;');

      if (apiConnectionAttempts < 2) {
        apiConnectionAttempts++;
        console.log(`%cTentando reconectar à API... Tentativa ${apiConnectionAttempts}`, 'color: orange;');
        setTimeout(checkApiConnection, 1000); // Tentativa após 1 segundo
      } else {
        console.log('%cFalha ao conectar à API após 2 tentativas.', 'color: red; font-weight: bold;');
      }
    });
};

/**
 * Captura headers antes de enviar a requisição.
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
  details => {
    if (!apiConnected) {
      console.log('%cAPI OFF. Captura de requisições desativada.', 'color: red; font-weight: bold;');
      return; // Interrompe a captura se a API estiver OFF
    }

    if (isUrlFiltered(details.url)) {
      const authorizationHeader = details.requestHeaders?.find(
        header => header.name.toLowerCase() === "authorization"
      );

      if (authorizationHeader) {
        if (!requestDetailsMap[details.requestId]) {
          requestDetailsMap[details.requestId] = {};
        }

        requestDetailsMap[details.requestId].headers = details.requestHeaders;
        requestDetailsMap[details.requestId].url = details.url;

        chrome.cookies.getAll({ url: details.url }, cookies => {
          requestDetailsMap[details.requestId].cookies = cookies;
        });
      }
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);

/**
 * Captura corpo da requisição.
 */
chrome.webRequest.onBeforeRequest.addListener(
  details => {
    if (!apiConnected) {
      console.log('%cAPI OFF. Captura de corpo de requisição desativada.', 'color: red; font-weight: bold;');
      return; // Interrompe a captura se a API estiver OFF
    }

    if (
      details.method === "POST" &&
      requestDetailsMap[details.requestId] &&
      isUrlFiltered(details.url)
    ) {
      const rawBody = details.requestBody?.raw?.[0]?.bytes;
      const bodyContent = rawBody ? new TextDecoder("utf-8").decode(new Uint8Array(rawBody)) : null;

      requestDetailsMap[details.requestId].body = bodyContent;
    }
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
);

/**
 * Captura respostas HTTP e envia para a API apenas as requisições filtradas e com header Authorization.
 */
chrome.webRequest.onCompleted.addListener(
  details => {
    if (!apiConnected) {
      console.log('%cAPI OFF. Captura de resposta desativada.', 'color: red; font-weight: bold;');
      return; // Interrompe a captura se a API estiver OFF
    }

    const requestInfo = requestDetailsMap[details.requestId];

    if (requestInfo && isUrlFiltered(requestInfo.url)) {
      const authorizationHeader = requestInfo.headers?.find(
        header => header.name.toLowerCase() === "authorization"
      );

      if (authorizationHeader) {
        const payload = {
          url: requestInfo.url,
          headers: requestInfo.headers,
          cookies: requestInfo.cookies || [],
          body: requestInfo.body || "",
          statusCode: details.statusCode,
          statusLine: details.statusLine,
          responseHeaders: details.responseHeaders || []
        };

        console.log('%cEnviando dados para API...', 'color: blue;');

        fetch(`${server}/api/capture`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
          .then(() => {
            console.log('%cDados enviados com sucesso!', 'color: green; font-weight: bold;');
            apiConnectionAttempts = 0; // Resetamos a contagem de tentativas após sucesso
          })
          .catch(err => {
            console.log(`%cErro ao enviar dados para a API: ${err.message}`, 'color: red; font-weight: bold;');
            console.log("%cAPI OFF", 'color: red; font-weight: bold;');

            // Tenta novamente se o número de tentativas for menor que 2
            if (apiConnectionAttempts < 2) {
              apiConnectionAttempts++;
              console.log(`%cTentando reconectar à API... Tentativa ${apiConnectionAttempts}`, 'color: orange;');
              setTimeout(() => {
                fetch(`${server}/api/capture`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
                });
              }, 1000);
            } else {
              console.log('%cFalha ao conectar à API após 2 tentativas.', 'color: red; font-weight: bold;');
            }
          });
      }
    }

    delete requestDetailsMap[details.requestId];
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

/**
 * Verifica abas e cria ou recarrega conforme necessário.
 */
const ensureTabWithFilter = () => {
  console.log('%cVerificando abas...', 'color: blue;');

  chrome.tabs.query({}, tabs => {
    const matchingTab = tabs.find(tab => isTabUrlFiltered(tab.url));

    if (matchingTab) {
      // Se encontrar uma aba correspondente, verifica se já está carregando a URL correta
      if (tabs_urls.includes(matchingTab.url)) {
        console.log(`%cAba já carregando a URL desejada: ${matchingTab.url}`, 'color: green;');
      } else {
        // Se a URL da aba não corresponder a uma URL filtrada, recarrega
        chrome.tabs.reload(matchingTab.id, { bypassCache: true }, () => {
          console.log(`%cAba recarregada: ${matchingTab.url}`, 'color: orange;');
        });
      }
    } else {
      // Se nenhuma aba corresponder, cria uma nova
      const newTabUrl = tabs_urls[0]; // Abre a primeira URL da lista
      chrome.tabs.create({ url: newTabUrl }, tab => {
        console.log(`%cNova aba criada: ${tab.url}`, 'color: green;');
      });
    }
  });
};

// Verifica as abas a cada 30 segundos
setInterval(() => {
  if (extensionStarted && apiConnected) {
    ensureTabWithFilter();
  }
}, 30000);

// Verifica a conexão com a API ao iniciar a extensão
checkApiConnection();
