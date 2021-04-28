import { Command } from '@structures';
import { Message, TextChannel } from 'discord.js';
import { Game } from '@structures';

export default class extends Command {
    constructor() {
        super('start', {
            aliases: ['start', 'init'],
            description: {
                content: "Starts a 100-game",
                examples: ["\nMay the luckiest one wins."],
            },
        });
    }

    async exec(message: Message) {
        const newGame = new Game(this.client, message.channel as TextChannel);
        newGame.start(message);
    }
}
