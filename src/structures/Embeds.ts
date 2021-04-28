import { MessageEmbed } from 'discord.js';
import { RichDisplay, RichDisplayOptions, RichMenu } from '@utils/pagination';
import type { Client } from './index';

export class Embeds {
    public client: Client;
    constructor(client: Client) {
        this.client = client;
    }

    default() {
        return new MessageEmbed().setColor('#000000');
    }

    richDisplay(options?: RichDisplayOptions) {
        return new RichDisplay(options);
    }

    richMenu(options?: RichDisplayOptions) {
        return new RichMenu(options);
    }

    success() {
        return new MessageEmbed().setColor('#ff66ab');
    }

    info(text: string) {
        return new MessageEmbed().setColor('#f0f0f0').setDescription(text);
    }

    clientError(text: string) {
        return new MessageEmbed().setColor('#ff0000').setDescription(text);
    }

    internalError(text: string) {
        return new MessageEmbed()
            .setColor('#ff0000')
            .setDescription(
                `An unexpected error has occurred${
                    text.length < 2000 ? `:\n\`\`\`${text}\`\`\`` : '.'
                }`
            );
    }
}
