import { Command } from '@structures';
import { Message } from 'discord.js';
import { RULES } from '@utils/constants';

export default class extends Command {
    constructor() {
        super('rules', {
            aliases: ['rules'],
            description: {
                content: 'Show the rules',
                examples: ['\nRules.'],
            },
        });
    }

    async exec(message: Message) {
        return message.channel.send(
            this.client.embeds
                .default()
                .setTitle('⚔️ Race to 100 ⚔️')
                .setDescription(`- **Number of players**: 1 - ∞.\n- **Rules**:\n${RULES}`)
        );
    }
}
