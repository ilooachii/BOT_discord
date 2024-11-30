const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
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

// Commande pour supprimer les messages simples
const commands = [
    new SlashCommandBuilder()
        .setName('clear_simple_messages')
        .setDescription('Supprime tous les messages simples (texte uniquement) dans les catégories restreintes.')
];

// Enregistrement des commandes
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        console.log('Enregistrement des commandes d\'application...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands.map(command => command.toJSON()) }
        );
        console.log('Commandes enregistrées avec succès !');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des commandes :', error);
    }
})();

// Le bot est prêt
client.once('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag}`);
});

// Fonction pour supprimer les messages en batch
async function deleteOldMessages(channel) {
    let deletedCount = 0;
    let lastMessageId;

    while (true) {
        const options = { limit: 100 };
        if (lastMessageId) options.before = lastMessageId;

        const messages = await channel.messages.fetch(options).catch(err => {
            console.error(`Erreur lors de la récupération des messages dans ${channel.name} :`, err);
            return null;
        });

        if (!messages || messages.size === 0) break;

        for (const [id, message] of messages) {
            if (
                !message.attachments.size && // Pas de fichier
                !message.content.startsWith('http') && // Pas de lien
                !message.author.bot // Pas envoyé par un bot
            ) {
                await message.delete().catch(err => {
                    console.error(`Erreur lors de la suppression du message ${id} :`, err);
                });
                deletedCount++;
            }
        }

        lastMessageId = messages.last().id;
    }

    return deletedCount;
}

// Écouter l'exécution de la commande
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'clear_simple_messages') {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            let totalDeletedCount = 0;

            // Parcourir tous les salons des catégories restreintes
            for (const categoryId of restrictedCategoryIds) {
                const category = guild.channels.cache.get(categoryId);

                if (!category) {
                    console.log(`❌ Catégorie non trouvée : ${categoryId}`);
                    continue;
                }

                console.log(`✅ Catégorie détectée : ${category.name}`);

                // Filtrer les salons appartenant à cette catégorie
                const channels = guild.channels.cache.filter(channel => channel.parentId === categoryId && channel.type === 0);

                for (const channel of channels.values()) {
                    console.log(`➡️ Salon détecté : ${channel.name}`);
                    const deletedCount = await deleteOldMessages(channel);
                    totalDeletedCount += deletedCount;
                    console.log(`Messages supprimés dans ${channel.name} : ${deletedCount}`);
                }
            }

            if (totalDeletedCount === 0) {
                await interaction.editReply('✅ Aucun message simple trouvé à supprimer dans les catégories restreintes.');
            } else {
                await interaction.editReply(`✅ ${totalDeletedCount} messages simples supprimés des catégories restreintes.`);
            }
        } catch (error) {
            console.error('Erreur lors de la suppression des messages :', error);
            await interaction.editReply('❌ Une erreur est survenue lors de la suppression des messages.');
        }
    }
});

// Supprimer les messages texte dans les salons des catégories restreintes (en temps réel)
client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    const channelCategoryId = message.channel.parentId; // Récupère l'ID de la catégorie du salon
    if (!restrictedCategoryIds.includes(channelCategoryId)) return;

    if (!message.attachments.size && !message.content.startsWith('http')) {
        message.delete().catch(console.error);

        message.channel.send(`${message.author}, seuls les fichiers, images ou liens sont autorisés ici !`).then(msg => {
            setTimeout(() => msg.delete(), 5000); // Supprime le message d'avertissement après 5 secondes
        });
    }
});

// Connecte le bot
client.login(process.env.DISCORD_TOKEN);
