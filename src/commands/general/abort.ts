import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('abort', {
            aliases: ['abort', 'cancel'],
            description: {
                content: 'Aborts the 100-game',
                examples: ['\nThe fun is over.'],
            },
        });
    }

    async exec(message: Message) {
        if (!this.client.game || this.client.game.ended) {
            return message.channel.send("There's no ongoing game to abort.");
        }
        this.client.game.abort();
    }
}
