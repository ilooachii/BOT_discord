const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Créer une instance de bot
const client = new Client({
    intents: [
        GatewayIntentBits.GuildMessages, // Pour surveiller les messages
        GatewayIntentBits.MessageContent, // Pour lire le contenu des messages
        GatewayIntentBits.Guilds, // Pour surveiller les événements du serveur
    ],
});

// Liste des IDs des catégories restreintes
const restrictedCategoryIds = [
    '1312375205506711634',
    '1312376844900765808',
    '1312376875418386432',
    '1312376890597572638',
];

// Le bot est prêt
client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);
});

// Supprimer les messages texte dans les salons des catégories restreintes
client.on('messageCreate', (message) => {
    // Ignorer les messages des bots
    if (message.author.bot) return;

    // Vérifier si le salon appartient à l'une des catégories restreintes
    const channelCategoryId = message.channel.parentId; // Récupère l'ID de la catégorie du salon
    if (!restrictedCategoryIds.includes(channelCategoryId)) return;

    // Vérifier si le message ne contient PAS de fichier/image et ne commence PAS par un lien
    if (!message.attachments.size && !message.content.startsWith('http')) {
        // Supprime le message
        message.delete().catch(console.error);

        // Avertir l'utilisateur (optionnel)
        message.channel.send(`${message.author}, seuls les fichiers, images ou liens sont autorisés ici !`).then(msg => {
            setTimeout(() => msg.delete(), 5000); // Supprime le message d'avertissement après 5 secondes
        });
    }
});

// Connecte le bot
client.login(process.env.DISCORD_TOKEN);
