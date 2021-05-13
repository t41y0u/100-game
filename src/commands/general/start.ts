import { Command } from '@structures';
import { Message, TextChannel } from 'discord.js';
import { Game } from '@structures';
import { MODES } from '@utils/constants';

export default class extends Command {
    constructor() {
        super('start', {
            aliases: ['start', 'init'],
            description: {
                content: 'Starts a 100-game',
                usage: '[mode:classic|unlimited|ur]',
                examples: [
                    '\nMay the luckiest one wins.',
                    ' m:ur\nStarts an Ultimate Random game.'
                ],
            },
            args: [
                {
                    id: 'mode',
                    match: 'option',
                    type: ['classic', 'unlimited', 'ur'],
                    flag: ['mode:', 'm:'],
                    default: 'classic',
                },
            ],
        });
    }

    async exec(message: Message, { mode }: { mode: MODES }) {
        if (this.client.game && !this.client.game.ended) {
            return message.channel.send("There's already an ongoing game. Please wait until the current game ended or abort it.");
        }
        this.client.game = new Game(this.client, message.channel as TextChannel, { mode });
        this.client.game.start(message);
    }
}
