const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// Rotas para a API do ViaCEP
app.get("/cep/:cep", async (req, res) => {
    const cep = req.params.cep;
    try {
        const response = await axios.get(
            `https://viacep.com.br/ws/${cep}/json/`,
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erro ao consultar o CEP." });
    }
});

app.get("/endereco/:uf/:cidade/:logradouro", async (req, res) => {
    const uf = req.params.uf;
    const cidade = req.params.cidade;
    const logradouro = req.params.logradouro;
    try {
        const response = await axios.get(
            `https://viacep.com.br/ws/${uf}/${cidade}/${logradouro}/json/`,
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erro ao consultar o endereço." });
    }
});

// Rota para a imagem do gato (exemplo)
app.get("/api/cat", async (req, res) => {
    try {
        const response = await axios.get(
            "https://api.thecatapi.com/v1/images/search",
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar imagem de gato." });
    }
});

// Configuração do Socket.IO
const server = http.createServer(app);
const io = socketIo(server);

io.on("connection", (socket) => {
    console.log("Um usuário se conectou");

    socket.on("setUsername", (username) => {
        socket.username = username;
        io.emit("userJoined", username);
    });

    socket.on("chatMessage", (msg) => {
        io.emit("chatMessage", msg);
    });

    socket.on("consultaCep", async (cep) => {
        try {
            const response = await axios.get(
                `https://viacep.com.br/ws/${cep}/json/`,
            );
            const data = response.data;

            if (data.erro) {
                socket.emit("cepResponse", { error: "CEP não encontrado." });
            } else {
                socket.emit("cepResponse", data);
            }
        } catch (error) {
            socket.emit("cepResponse", { error: "Erro ao consultar o CEP." });
        }
    });

    socket.on("disconnect", () => {
        console.log("Um usuário se desconectou");
    });
});

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
