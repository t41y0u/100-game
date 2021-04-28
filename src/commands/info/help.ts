import { Command } from '@structures';
import { Argument, Category } from 'discord-akairo';
import { Message } from 'discord.js';
const { PREFIX } = process.env;

const TITLE_LIST = {
    general: 'General',
    info: 'Info',
    owner: 'Owner',
    settings: 'Settings',
};

export default class extends Command {
    constructor() {
        super('help', {
            aliases: ['help', 'halp', 'h'],
            description: {
                content: 'Shows a list of commands or information about a command.',
                usage: '[command]',
                examples: [
                    '\nShows a list of commands (after the first page).',
                    ' rules\nShows information about `rules` command.',
                ],
            },
            args: [
                {
                    id: 'commandAlias',
                    type: Argument.product('commandAlias', 'lowercase'),
                },
            ],
        });
    }

    exec(message: Message, { commandAlias }: { commandAlias: [Command, string] }) {
        if (!commandAlias) return this.execCommandList(message);

        const command = commandAlias[0],
            alias = commandAlias[1];
        let {
            id,
            aliases,
            description: { content, examples, additionalInfo },
            cooldown,
        } = command;
        if (command.areMultipleCommands) {
            id = Object.keys(command.subAliases).find(
                key => key === alias || command.subAliases[key].aliases?.includes(alias)
            );
            aliases = command.subAliases[id].aliases ?? [alias];
            content = command.subAliases[id].description;
            examples = command.subAliases[id].examples;
            additionalInfo = command.subAliases[id].additionalInfo;
        }

        const clientPermissions = command.clientPermissions as string[];
        const userPermissions = command.userPermissions as string[];

        const embed = this.client.embeds
            .default()
            .setTitle(`${PREFIX}${id}`)
            .setDescription(`\`\`\`${content ?? 'No description specified.'}\`\`\``);

        embed.addField('Usage', `${PREFIX}${id} ${command.description.usage ?? ''}`);

        if (examples)
            embed.addField(
                'Examples',
                examples
                    .map((e: string) => {
                        const [example = '', description = ''] = e
                            .replace('\n', '\x01')
                            .split('\x01');
                        return `• \`${PREFIX}${id}${example}\`\n${description}`;
                    })
                    .join('\n')
            );

        if (clientPermissions)
            embed.addField(
                'Required Bot Permissions',
                clientPermissions.map(p => this.client.util.toTitleCase(p)).join(', '),
                true
            );

        if (userPermissions)
            embed.addField(
                'Required User Permissions',
                userPermissions.map(p => this.client.util.toTitleCase(p)).join(', '),
                true
            );

        if (aliases && aliases.length > 1)
            embed.addField('Aliases', aliases.slice(1).join(', '), true);

        if (cooldown) embed.addField('Cooldown', `${cooldown / 1000} seconds`, true);

        if (additionalInfo) embed.addField('More', additionalInfo);

        return message.channel.send({ embed });
    }

    async execCommandList(message: Message) {
        const display = this.client.embeds
            .richDisplay()
            .addPage(
                this.client.embeds
                    .default()
                    .setTitle('Command List')
                    .setDescription(
                        `Use \`${PREFIX}help [command]\` for more help. E.g: \`${PREFIX}help rules\`.`
                    )
                    .addField('Command Guide', [
                        '• <> : Required',
                        '• [] : Optional',
                        '• () : Choose 1',
                    ])
                    .addField('Emote Guide', [
                        '• ⏪ ⏩ : Jumps to first/last page',
                        '• ◀ ▶ : Jumps to previous/next page',
                        '• ↗️ : Jumps to specified page',
                        '• ℹ️ : Jumps to info page',
                        '• 🗑 : Deletes bot message',
                    ])
            );
        for (const [category, commands] of this.client.commandHandler.categories) {
            const title = TITLE_LIST[category as keyof typeof TITLE_LIST];
            const publicCommands =
                message.author.id === this.client.ownerID
                    ? commands.filter((c: Command) => !c.isConditionalorRegexCommand)
                    : (commands.filter(
                          (c: Command) => !c.ownerOnly && !c.isConditionalorRegexCommand
                      ) as Category<string, Command>);
            const embed = this.client.embeds.default().setTitle(title);
            let cmds: string[] = [];
            publicCommands
                .sort((a: Command, b: Command) =>
                    a.areMultipleCommands === b.areMultipleCommands
                        ? 0
                        : a.areMultipleCommands
                        ? 1
                        : -1
                )
                .forEach((c: Command) => {
                    if (c.areMultipleCommands) {
                        const subCmds = c.areMultipleCommands
                            ? Object.keys(c.subAliases)
                            : c.aliases;
                        cmds = cmds.concat(
                            subCmds.map(sc => `${c.nsfw ? '`🔞`' : ''}__\`${sc}\`__`)
                        );
                        cmds.push(cmds.pop() + '\n\n');
                    } else {
                        cmds.push(`${c.nsfw ? '`🔞`' : ''}__\`${c.id}\`__`);
                    }
                });
            embed.setDescription(cmds.join(' '));
            display.addPage(embed);
        }
        return display.run(
            this.client,
            message,
            message, // await message.channel.send('Loading command list...'),
            '',
            {
                time: 180000,
            }
        );
    }
}
