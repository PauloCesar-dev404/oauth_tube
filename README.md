<h1 align="center">
  <img src="https://raw.githubusercontent.com/PauloCesar-dev404/oauth_tube/main/OAUTH_Tube/icons/favicon.png" alt="oauth_tube Logo" width="380">
  oauth_tube
</h1>
<p align="center">Extensão voltada para desenvolvedores, que automatiza a captura das credenciais necessárias para autenticação no YouTube, permitindo o uso dessas credenciais em suas aplicações.</p>

## Como Usar

### Iniciar a API Local

Execute o comando `init` para inicializar a API local e começar a captura de credenciais.

**Exemplo de script para obter os dados da API:**

```python
import os
from oauth_tube import CACHE  # Importa o diretório onde estão os dados salvos

# Função para listar os arquivos no diretório CACHE
def listar_arquivos():
    try:
        # Verifica se o diretório CACHE existe
        if os.path.exists(CACHE) and os.path.isdir(CACHE):
            # Lista todos os arquivos e diretórios dentro do diretório CACHE
            arquivos = os.listdir(CACHE)
            if arquivos:
                print("Arquivos encontrados no diretório CACHE:")
                for arquivo in arquivos:
                    print(arquivo)
            else:
                print("Não há arquivos no diretório CACHE.")
        else:
            print(f"O diretório {CACHE} não existe ou não é um diretório válido.")
    except Exception as e:
        print(f"Erro ao listar arquivos: {e}")

# Chama a função para listar os arquivos
listar_arquivos()
```

### Parar a API Local

Se desejar interromper a API, execute o comando `stop`.

### Ver Comandos Disponíveis

Use o comando `help` para exibir a lista completa de comandos que você pode usar.

---

## Instalação

Para instalar a API local `oauth_tube`, siga as etapas abaixo:

1. Baixe a API local com o comando:

   ```bash
   pip install oauth_tube-1.0-py3-none-any.whl
   ```

2. Após a instalação, inicialize a API local com o comando:

   ```bash
   oauth_tube init
   ```

---

## Aviso de Segurança

**Atenção!** Ao usar esta extensão, esteja ciente de que as credenciais são transmitidas via rede. **Recomendamos** que você use a extensão apenas em redes seguras para proteger seus dados.

