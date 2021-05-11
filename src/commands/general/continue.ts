import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('continue', {
            aliases: ['continue'],
            description: {
                content: 'Continues the 100-game',
                examples: ['\nThe party continues.'],
            },
        });
    }

    async exec(message: Message) {
        if (!this.client.game || this.client.game.ended) {
            return message.channel.send("There's no ongoing game to continue.");
        }
        this.client.game.continue();
    }
}
