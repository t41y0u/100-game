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
        if (!this.client.game || this.client.game.ended) {
            return message.channel.send("There's no ongoing game to pause.");
        }
        this.client.game.pause();
    }
}
