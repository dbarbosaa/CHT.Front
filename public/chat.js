const apikey = "sk-proj-";  // chave de acesso da api do chatGPT;
const socket = io();  // socket de comunicação do chat;
const form = document.getElementById("form");
const input = document.getElementById("input");
const chat = document.getElementById("chat");

// Novo nome para o ChatGPT
const assistantName = "Assistente";

// Obter nome de usuário da URL
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get("username");

if (username) {
  socket.emit("setUsername", username);
} else {
  window.location.href = "index.html"; // Redireciona para a tela de login se o nome de usuário não estiver definido
}

// Mapeamento de palavras para sons
const wordSoundMap = {
  gato: "sounds/gato.mp3",
  cachorro: "sounds/cachorro.mp3",
  pato: "sounds/pato.mp3",
};

// Carregar os elementos de áudio
const audioElements = {};
Object.keys(wordSoundMap).forEach((word) => {
  const audio = new Audio(wordSoundMap[word]);
  audioElements[wordSoundMap[word]] = audio;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (input.value) {
    const message = `${username}:${input.value}`;
    socket.emit("chatMessage", message);
    input.value = "";

    await handleChatMessage(message, true);
  }
});

socket.on("userJoined", (username) => {
  const item = document.createElement("li");
  item.textContent = `${username} entrou no chat`;
  chat.appendChild(item);
  scrollToBottom();
});

socket.on("chatMessage", async (msg) => {
  if (typeof msg === "string") {
    const [msgUsername, msgText] = msg.split(":");
    const item = document.createElement("li");
    const isSentMessage = msgUsername === username;

    item.classList.add(isSentMessage ? "sent" : "received");
    item.innerHTML = `<strong>${msgUsername}:</strong> ${msgText}`;
    chat.appendChild(item);
    scrollToBottom();

    if (!isSentMessage) {
      await handleChatMessage(msgText.toLowerCase());
    }
  }
});

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

async function handleChatMessage(message, isUserMessage = false) {
  let actionTaken = false;

  // Função para adicionar item de imagem ao chat
  const addImageToChat = (imageUrl, altText) => {
    const item = document.createElement("li");
    item.innerHTML = `<img src="${imageUrl}" alt="${altText}" width="150px" height="150px">`;
    chat.appendChild(item);
    scrollToBottom();
  };

  // Função para reproduzir áudio correspondente
  const playAudio = (audio) => {
    audio.play().catch((error) => {
      console.error(`Erro ao reproduzir áudio: ${error.message}`);
    });
  };

  // Verificação de palavras-chave na mensagem
  for (const word of Object.keys(wordSoundMap)) {
    if (message.includes(word)) {
      const audio = audioElements[wordSoundMap[word]];
      playAudio(audio);

      // Se houver uma correspondência, verificar se há uma API associada
      try {
        const response = await axios.get(`/api/${word}`);
        const imageUrl = response.data.imageUrl;
        console.log(`URL da imagem recebida para ${word}: ${imageUrl}`);
        addImageToChat(imageUrl, `Imagem de ${word}`);
        actionTaken = true;
      } catch (error) {
        console.error(`Erro ao buscar imagem para ${word}: ${error.message}`);
      }
    }
  }

  // Se nenhuma ação específica foi tomada, verificar por ações genéricas
  if (!actionTaken) {
    try {
      if (message.includes("gato")) {
        const response = await fetch("https://api.thecatapi.com/v1/images/search");
        const data = await response.json();
        const imageUrl = data[0].url;
        addImageToChat(imageUrl, "Imagem de gato");
      } else if (message.includes("pokemon")) {
        const response = await axios.get("https://pokeapi.co/api/v2/pokemon?limit=100");
        const pokemonList = response.data.results;
        const randomIndex = Math.floor(Math.random() * pokemonList.length);
        const pokemonName = pokemonList[randomIndex].name;
        const pokemonResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        const pokemonData = pokemonResponse.data;
        const imageUrl = pokemonData.sprites.front_default;
        addImageToChat(imageUrl, `Imagem de ${pokemonName}`);
      } else if (message.includes("cachorro")) {
        const response = await axios.get("https://dog.ceo/api/breeds/image/random");
        const imageUrl = response.data.message;
        addImageToChat(imageUrl, "Imagem de cachorro");
      }
    } catch (error) {
      console.error(`Erro ao buscar dados: ${error.message}`);
    }
  }

  // Verifica se a mensagem contém um padrão de CEP
  const cepRegex = /\b\d{5}-?\d{3}\b/;
  if (cepRegex.test(message)) {
    const cep = message.match(cepRegex)[0].replace(/\D/g, ''); // Extrai o CEP da mensagem
    await fetchCepInfo(cep);
  }

  // Enviar mensagem ao ChatGPT se nenhuma ação específica foi tomada e se for uma mensagem do usuário
  if (!actionTaken && isUserMessage) {
    await sendMessageToChatGPT(message);
  }
}

// api do cep;

async function fetchCepInfo(cep) {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      throw new Error("CEP não encontrado");
    }

    const { logradouro, bairro, localidade, uf } = data;
    const infoMessage = `Endereço: ${logradouro}, Bairro: ${bairro}, Cidade: ${localidade} - ${uf}`;

    const item = document.createElement("li");
    item.innerHTML = `<strong>ViaCEP: </strong> ${infoMessage}`;
    chat.appendChild(item);
    scrollToBottom();
  } catch (error) {
    const item = document.createElement("li");
    item.innerHTML = `<strong>Erro:</strong> Não foi possível encontrar o CEP informado.`;
    chat.appendChild(item);
    scrollToBottom();
    console.error(`Erro ao buscar informações do CEP: ${error.message}`);
  }
}


// chamando a api do chat gpt
async function sendMessageToChatGPT(message) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: 'POST',
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apikey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{"role": "user", "content": message}],
        max_tokens: 2048,
        temperature: 0.5,
      })
    });


  // Exibir msg resposta na tela; 
    const data = await response.json();
    if (data.choices && data.choices.length > 0) {

      let r = data.choices[0].message.content || data.choices[0].text;

      const item = document.createElement("li");

      item.innerHTML = `<strong>${assistantName}:</strong> ${r}`;
      chat.appendChild(item);
      scrollToBottom();
    } else {
      throw new Error("Resposta vazia ou nenhuma escolha encontrada.");
    }
  } catch (e) {
    console.log('Erro:', e);
    // Exiba uma mensagem de erro ao usuário, se necessário
  }
}
