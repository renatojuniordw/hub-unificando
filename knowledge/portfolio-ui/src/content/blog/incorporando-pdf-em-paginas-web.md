---
title: "Incorporando PDF em Páginas Web"
description: "Duas formas de incorporar documentos PDF em uma página HTML — com as tags nativas <object>/<embed> e com a biblioteca PDFObject — mais o CSS para deixar o visualizador responsivo."
date: "2020-07-22"
tags:
  - HTML
  - JavaScript
  - PDF
  - Web
readingTime: "2 min"
---

PDF significa Portable Document Format. O formato foi desenvolvido pela Adobe e disponibilizado gratuitamente em 1993.

Existem vários métodos para incorporar um PDF em uma página web — vou apresentar dois deles: usando tags do HTML e usando uma biblioteca.

## Usando tags do HTML

```html
<object data="/pdf/sample-3pp.pdf" type="application/pdf" width="750px" height="750px">
  <embed src="/pdf/sample-3pp.pdf" type="application/pdf"></embed>
</object>
```

Usar as tags `<object>` e `<embed>` juntas dá uma amplitude maior de compatibilidade entre navegadores — se um deles não suportar `<object>`, o `<embed>` aninhado serve de fallback.

## Usando a biblioteca PDFObject

A biblioteca escolhida foi a [PDFObject](https://pdfobject.com/), simples e fácil de utilizar. Para incorporar o PDF, siga os passos abaixo:

**1. Crie uma `<div>` para embedar o PDF**

```html
<div id="example1"></div>
```

**2. Diga ao PDFObject qual PDF incorporar e onde incorporá-lo**

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js"></script>
<script>
  PDFObject.embed("/pdf/sample-3pp.pdf", "#example1");
</script>
```

## Bônus: CSS para tela cheia

Para incorporar o PDF ocupando a página toda, configure o seguinte CSS:

```css
* {
  margin: 0;
  min-height: 100vh;
}
```

Caso esteja usando a biblioteca PDFObject, acrescente também:

```css
.pdfobject-container {
  height: 30rem;
}
```

[Clique aqui](https://pdfobject.com/) para conferir a documentação e os exemplos oficiais do PDFObject.
