## Docker

```sh
docker build -t ironbook .
docker run --rm -p 3000:3000 ironbook
```

## INSTALL

Requirements:

 - [GNU Make](http://www.gnu.org/software/make/)
 - [GNU M4](http://www.gnu.org/software/m4/)
 - [princexml](http://www.princexml.com/download/)

```sh
make
```

To generate:

- the cover: `make public/cover.pdf`
- the pages: `make public/pages.pdf`
- the cover and pages: `make public/coverandpages.pdf`

## Overrides

If you want to override default values, just:

```sh
make clean && make M4OPTS='PAGEWIDTH=400 PAGEHEIGHT=300 THEME=#F26657 COLORFUL=1' public/cover.pdf
```

`M4OPTS` are among:

*common*:

- `PAGEWIDTH` *(default: `203`)*
- `PAGEHEIGHT` *(default: `254`)*
- `THEME` *(default: `#00B7D4`)*
- `THEMEOPPOSITE` *(default: `#ffffff`)*

*for `public/cover.pdf`*:

![cover-diagram](https://docs.google.com/drawings/d/11b0fJ0ATeNg-WdoQhmenD2gARe7RTP_1V358ot__bQo/pub?w=960&amp;h=720)

- `BLEED` *(default: `5`)*
- `BSCX` *(default: `3`)*
- `BSCY` *(default: `3`)*
- `FOLDMARGIN` *(default: `16.2`)*
- `SPINEFOLDMARGIN` *(default: `11.7`)*
- `SPINEWIDTH` *(default: `18`)*
- `CANEVASWIDTH` *(default: `515`)*
- `CANEVASHEIGHT` *(default: `359`)*
- `RIGHT` *(default: `6.4`)*
- `TOP` *(default: `9.1`)*
- `COLORFUL` *(default: `0`)*

*for `public/pages.pdf`*:

![page-diagram](https://docs.google.com/drawings/d/1Bf-B5098A1MDI5OHWLeNU0mOgXZ4kw8ADnYXjdgBXio/pub?w=399&amp;h=499)

- `MARGINTOP` *(default: `17`)*
- `MARGINRIGHT` *(default: `5`)*
- `MARGINBOTTOM` *(default: `0`)*
- `MARGINLEFT` *(default: `5`)*
- `MARGINBINDING` *(default: `12.7`)*
- `BLEED` *(default: `3.15`)*
- `NOINKLEFT` *(default: `3`)*
- `NOINKRIGHT` *(default: `3`)*
- `THEMESEMIOPAQUE` *(default: `#EBF5F8`)* -- lighter theme color
- `THEMESUBJECT1` *(default: `#FF6D67`)* -- color associated with subject1
- `THEMESUBJECT1SEMIOPAQUE` *(default: `#ffc6c6`)* -- lighter color associated with subject1
- `THEMESUBJECT2` *(default: `#68A4B0`)* -- color associated with subject2
- `THEMESUBJECT2SEMIOPAQUE` *(default: `#bee9ec`)* -- lighter color associated with subject2
- `THEMESUBJECT3` *(default: `#F6D273`)* -- color associated with subject3
- `THEMESUBJECT3SEMIOPAQUE` *(default: `#fce9ba`)* -- lighter color associated with subject3
- `THEMESUBJECT4` *(default: `#7CAE58`)* -- color associated with subject4
- `THEMESUBJECT4SEMIOPAQUE` *(default: `#bfd1b2`)* -- lighter color associated with subject4
- `THEMESUBJECT5` *(default: `#AEDBE8`)* -- color associated with subject5
- `THEMESUBJECT5SEMIOPAQUE` *(default: `#ffcfb5`)* -- lighter color associated with subject5






  // document.addEventListener('DOMContentLoaded', (event) => {
  //   document.querySelectorAll('.hljs .wrapper').forEach(function (el) {
  //     const textContent = el.querySelector('.code').textContent;
  //     el.parentNode.textContent = textContent;
  //   });

  //   document.querySelectorAll('pre code').forEach((block) => {
  //     hljs.highlightBlock(block);
  //     hljs.lineNumbersBlock(block);
  //   });
  // });

  //hljs.initHighlightingOnLoad();