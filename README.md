# ⚔️ Sobre o acesso ao script

O acesso aos scripts deste projeto é controlado por um sistema de login.

✅ **Para adquirir um login**, entre em contato diretamente via Discord.  
🚧 Atualmente está em desenvolvimento um site que permitirá a criação de contas de forma automatizada para facilitar o uso e o gerenciamento de acesso aos scripts.

📬 **Contato Discord:** `alexandre458#7418`  
🔗 [Clique para abrir o perfil](https://discord.com/users/719392722141839371)

---

## 🛠️ Estrutura Técnica

A plataforma de autenticação e entrega dos scripts foi desenvolvida com foco em segurança e escalabilidade.

**Tecnologias utilizadas:**
- **Node.js + Express** — Servidor principal da API
- **PostgreSQL + Sequelize** — Banco de dados relacional com ORM
- **JWT (JSON Web Token)** — Autenticação por sessão temporária
- **Sistema de Licenças** — Cada usuário possui permissões, duração e validade configuráveis

O sistema valida o acesso ao script de forma individual, controlando sessões e protegendo o conteúdo original.

## 📡 Integração com WhatsApp

O sistema de notificações do bot utiliza uma **API WhatsApp própria**, desenvolvida para permitir comunicação direta entre o jogo e o jogador via mensagens automatizadas.

**Tecnologias utilizadas na API WhatsApp:**

- **Node.js + Express** — Servidor backend leve e rápido
- **Baileys** — Biblioteca para conexão com o WhatsApp Web
- **WebSocket** — Comunicação em tempo real entre cliente e servidor
- **REST API (HTTP)** — Interface para envio de mensagens e gerenciamento de sessões
- **QR Code Generator** — Para pareamento com a conta WhatsApp
- **Banco de dados (SQLite ou MongoDB)** — Para persistência de sessões e controle de envio
- **PM2** — Gerenciador de processos para manter a API ativa de forma contínua

A API roda em ambiente local ou em servidor privado, garantindo notificações seguras e instantâneas configuradas individualmente por cada usuário.


# ⚔️ Scripts de Automação para Grepolis

Este repositório contém scripts Tampermonkey desenvolvidos para automatizar diversas tarefas no jogo [Grepolis](https://www.grepolis.com/).  
Os scripts foram criados com o objetivo de facilitar o gerenciamento de cidades, envio de recursos, recrutamento automático, coleta de aldeias, entre outros.

## 📜 Aviso Legal

**O uso dos scripts disponibilizados neste repositório é de total responsabilidade do usuário.**

> ⚠️ Não nos responsabilizamos por qualquer consequência decorrente da utilização destes scripts, incluindo, mas não se limitando a:  
> - Banimento de conta  
> - Perda de progresso no jogo  
> - Problemas de compatibilidade com atualizações do Grepolis

Estes scripts são fornecidos apenas para fins educacionais e de experimentação.

---

## ✅ Requisitos

- Navegador Google Chrome, Firefox ou outro compatível  
- Extensão [Tampermonkey](https://www.tampermonkey.net/)

---

## 📦 Scripts Disponíveis

- `Auto Farm`: Coleta automática de recursos das aldeias com base na cidade com menor armazenamento.
- `Auto Up Aldeias`: Constrói e melhora aldeias de forma automática.
- `Auto Construtor`: Sistema de construção por grupo, com opção de encadeamento de ordem.
- `Auto Construir Faróis`: Recruta faróis com base em grupo de cidades, movendo herói e recursos.
- `Auto Construir Birremes`: Recruta birremes com base em grupo de cidades, movendo herói e recursos.
- `Auto Construir Tropas`: Recrutamento automático de tropas com base em grupo de cidades (sem uso de herói).
- `Auto Pesquisa`: Automatização de pesquisas de academia com setup por grupo.
- `Auto Cultura`: Faz automaticamente (festival, jogos, desfile, teatro), com configuração mínima de pontos de combates para o desfile.
- `Notificações`: Sistema de alertas via WhatsApp e Discord para:
  - Ataques
  - Slots abertos
  - Captchas ativos
  - Ouro disponível no mercado
- `Enviar Apoio`: Envio automático de apoio terrestre/naval, com cálculo de transporte.
- `Sistema de NC`: Envio automático e fabricação de navios colonizadores (muito usado em mults).
- `Auto Refresh`: Atualização periódica da página.
- `Auto Gruta`: Guarda automaticamente recursos na gruta (nível 10).
- `Auto Atacar Missão da Ilha`: Automação de ataques em missões iniciais.
- `Auto Colocar Deus`: Define automaticamente um deus para cidades sem um, de forma balanceada.
- `Sistema de Feitiços`: Spam automático de feitiços como purificação, narcismo, proteção ou peste (muito usado em modo cerco).

... e muitos outros scripts utilitários em constante atualização!

---

## ⚙️ Como Usar

1. Instale o Tampermonkey no seu navegador.
2. Crie um novo script e cole o conteúdo desejado deste repositório.
3. Salve e ative o script.
4. Acesse o Grepolis normalmente.

---

## ❗ Importante

O uso de automações é contra os termos de uso do Grepolis e pode resultar em punições. Utilize com consciência e por sua conta e risco.

---

## 👨‍💻 Autor

Scripts desenvolvidos e adaptados por **Alexandre458**, com contribuições da comunidade Grepolis.
