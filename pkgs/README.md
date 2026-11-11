# Catálogo HaidHEN Games

Somente publique PKGs que você criou ou tem autorização para distribuir.

## 1. Descoberta automática

Arquivos `.pkg` enviados para esta pasta no repositório público aparecem automaticamente no catálogo
via API pública do GitHub (quando acessível pelo navegador). O arquivo `catalog.json` serve como alternativa
manual e para mostrar títulos, descrições e URLs externas.

## 2. Arquivos grandes

GitHub Pages não é um host adequado para jogos grandes. Um arquivo Git comum não pode exceder 100 MB;
a publicação do Pages tem limites adicionais. Para conteúdo maior, use um servidor próprio ou serviço de
armazenamento com permissão para distribuir e com downloads HTTP estáveis (idealmente suporte a Range).

## 3. Adicionar um item ao catálogo manualmente

Edite `catalog.json` assim (exemplo fictício; não se refere a um arquivo real):

```json
{
  "games": [
    {
      "title": "Meu jogo homebrew",
      "file": "https://meu-servidor.exemplo/homebrew.pkg",
      "version": "1.0",
      "description": "Jogo independente para PS4",
      "bytes": 10485760,
      "cover": "https://meu-servidor.exemplo/capa.png",
      "author": "Desenvolvedor independente"
    }
  ]
}
```

No campo `file`, também funciona `pkgs/meu-jogo.pkg` se o arquivo realmente existir no GitHub Pages.
O catálogo não autentica nem inspeciona os pacotes: valide origem, compatibilidade e integridade antes de publicar.

## 4. Integração nativa ainda pendente

Ativar o Payload Server na porta 9090 não cria a API de instalação usada pela página.
O botão **Instalar no PS4** faz uma tentativa HTTP (sem confirmação de resposta) em
`http://127.0.0.1:12800/api/install`. Isso exige um instalador compatível funcionando no próprio console e
pode ser bloqueado pelo navegador do PS4 por políticas HTTP/CORS.
Não há envio automático de `haidstore.bin`, notificação nativa nem instalação comprovada nesta versão.
