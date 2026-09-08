---
title: "Envio de E-mails com Nodemailer e Gmail SMTP"
description: "Como configurar o Nodemailer com Express e o servidor SMTP do Gmail para enviar e-mails a partir de uma aplicação Node.js, do zero até uma rota funcional."
date: "2021-02-01"
tags:
  - Node.js
  - Nodemailer
  - Express
  - SMTP
readingTime: "2 min"
---

Nodemailer é um módulo do Node.js que permite o envio de e-mails utilizando JavaScript no lado do servidor. Aqui você vai passar por todo o processo: da configuração do Nodemailer na aplicação até a configuração do SMTP do Google.

## Configurando o Express

Para utilizar o Nodemailer é necessário ter o Express configurado em sua aplicação. Para instalá-lo, siga as [instruções oficiais do Express](https://expressjs.com/pt-br/starter/installing.html).

## Servidor SMTP do Google

Para realizar a configuração, você precisa de uma conta do Gmail ou G Suite.

### Configurar o servidor SMTP do Gmail

> **Atualização:** o guia original de 2021 orientava a habilitar "acesso a app menos seguro" e desativar a verificação em duas etapas para simplificar os testes. O Google **descontinuou essa opção em 2022**. Hoje, mantenha a verificação em duas etapas ativa e gere uma **senha de app** em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — use essa senha no lugar da senha normal da conta.

## Instalar o Nodemailer

O Nodemailer será responsável pelo envio de e-mail da aplicação. Para instalar o pacote, basta executar:

```bash
npm install nodemailer
```

## Configurar o Nodemailer no projeto

No seu projeto, em `app.js`, importe o Nodemailer:

```javascript
const nodemailer = require('nodemailer');
```

Agora, configure o SMTP, o remetente e a função de envio:

```javascript
// Configuração do SMTP
const configSMTP = {
    host: 'smtp.gmail.com',
    service: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'seugmail@gmail.com',
        pass: 'suasenha'
    }
}

// Configuração do e-mail a ser enviado
const sendEmail = {
    "from": "from@example.com",
    "to": "to@example.com",
    "subject": "[nodemailer] Teste de e-mail",
    "text": "Olá, estou te enviando esse e-mail através de um módulo do JavaScript."
}

// Envio do e-mail
configSMTP.sendMail(sendEmail, (error) => {
    if (error) {
        console.log(error)
    } else {
        console.log('E-mail enviado com sucesso!')
    }
});
```

## Configurando a rota com Express

Vamos criar uma rota do tipo `POST` em `app.js`, para receber o e-mail a ser enviado no corpo da requisição:

```javascript
router.post('/sendEmail', (req, res, next) => {
    configSMTP.sendMail(req.body, (error) => {
        if (error) {
            console.log(error)
        } else {
            console.log('E-mail enviado com sucesso!')
        }
    });
});
```

Com a rota configurada, você pode chamá-la passando os seguintes dados no corpo da requisição:

```json
{
    "from": "from@example.com",
    "to": "to@example.com",
    "subject": "[nodemailer] Teste de e-mail",
    "text": "Olá, estou te enviando esse e-mail através de um módulo do JavaScript."
}
```

## Executando o projeto

Para executar o projeto, basta rodar:

```bash
node app.js
```

Com o projeto rodando, realize a requisição. Se tudo ocorrer corretamente, a mensagem "E-mail enviado com sucesso!" será exibida no terminal.

## Fontes

- [Como utilizar o servidor SMTP do Google](https://www.hostinger.com.br) — Hostinger
- [Nodemailer](https://nodemailer.com) — documentação oficial
