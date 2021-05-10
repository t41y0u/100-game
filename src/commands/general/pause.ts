import { Command } from '@structures';
import { Message } from 'discord.js';

export default class extends Command {
    constructor() {
        super('pause', {
            aliases: ['pause'],
            description: {
                content: 'Pause the 100-game',
                examples: ['\nPauseChamp.'],
            },
        });
    }

    async exec(message: Message) {
        this.client.game.pause();
    }
}
