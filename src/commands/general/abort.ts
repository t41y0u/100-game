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
        this.client.game.abort();
    }
}
