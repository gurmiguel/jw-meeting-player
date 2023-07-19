# JW Meeting Player

O propósito desse projeto é criar uma aplicação capaz de suprir todas as necessidades ao comandar o áudio e vídeo de uma reunião.

### Principais funcionalidades

- Baixar e persistir em disco automaticamente as imagens e os vídeos da reunião do dia, com base no https://wol.jw.org, na aba reuniões. É possível acessar a semana atual utilizando a url conforme o [padrão de formatação](https://date-fns.org/v2.16.1/docs/format) do `date-fns`: https://wol.jw.org/pt/wol/meetings/r5/lp-t/{yyyy}/{w};
- Listar as mídias em ordem de quando aparecem;
- Permitir abrir as mídias na segunda tela por simplesmente clicar na mesma a partir da listagem;
- Ao reproduzir alguma mídia, habilitar os controles pertinentes, como Play, Pause, Stop (fechar a mídia), Backward, Forward;
- Mostrar o texto do ano (buscar também do https://wol.jw.org) na tela do Player quando em estado `idle`;
- Permitir adicionar mídias avulsas para a reunião atual em uma categoria separada, podendo agrupá-las e ordenar e nomeá-las individualmente (exemplo, imagens de um discurso, vídeos de fora do JW);

### Possíveis funcionalidades *(avaliar a possiblidade)*

- Sincronizar as mídias com o Zoom, seja automaticamente ou por ação manual, exemplo: compartilhar no zoom ao reproduzir um vídeo;
- Controlar rotinas padrão de controle da reunião no Zoom, como iniciar a reunião já habilitando a enquete e os controles pertinentes;