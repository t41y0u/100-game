import { Command, Listener } from '@structures';
import { Message } from 'discord.js';

export default class extends Listener {
    constructor() {
        super('commandStarted', {
            emitter: 'commandHandler',
            event: 'commandStarted',
            category: 'commandHandler',
        });
    }

    exec(message: Message, command: Command) {
        const alias = message.util?.parsed?.alias;
        this.client.logger.log(
            `${message.author.tag} (ID: ${message.author.id}) => ${command.id} (${
                alias ?? command.id
            })`
        );
    }
}
