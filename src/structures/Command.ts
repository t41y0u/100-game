import { Command as C, CommandOptions as CO } from 'discord-akairo';
import type { Client } from './Client';
import type { ReactionHandler } from '@utils/pagination/ReactionHandler';

type SubAlias = {
    [key: string]: {
        aliases?: string[];
        description: string;
        examples: string[];
        additionalInfo?: string;
    };
};

export interface CommandOptions extends CO {
    nsfw?: boolean;
    isConditionalorRegexCommand?: boolean;
    subAliases?: SubAlias;
    description?: {
        content?: string;
        usage?: string;
        examples?: string[];
        additionalInfo?: string;
    };
}

export class Command extends C {
    client: Client;
    nsfw?: boolean;
    areMultipleCommands: boolean;
    isConditionalorRegexCommand: boolean;
    subAliases: SubAlias;
    silent?: boolean;
    movePage?: (currentHandler: ReactionHandler, diff: number) => Promise<boolean>;
    constructor(id: string, options?: CommandOptions) {
        options.channel = 'guild';
        options.typing = true;
        super(id, options);
        const { isConditionalorRegexCommand = false, subAliases = {} } = options;
        this.nsfw = Boolean(options.nsfw);
        this.isConditionalorRegexCommand = Boolean(isConditionalorRegexCommand);
        this.subAliases = subAliases;
        this.areMultipleCommands = Object.keys(this.subAliases).length !== 0;
    }
}
