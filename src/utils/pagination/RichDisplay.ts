/**
 * Inspired by https://github.com/dirigeants/klasa/blob/master/src/lib/util/RichDisplay.ts
 * @author: Dirigeants Organization (dirigeants)
 */

import { Message, MessageEmbed as Embed } from 'discord.js';
import { Cache } from './Cache';
import { ReactionMethods, ReactionHandlerOptions, ReactionHandler } from './ReactionHandler';
import { Client } from '@structures';

type EmbedOrCallback = Embed | ((embed: Embed) => Embed);

export interface RichDisplayOptions {
	template?: EmbedOrCallback;
	remove?: boolean;
	jump?: boolean;
	firstLast?: boolean;
    removeRequest?: boolean;
    list?: number;
}

export class RichDisplay {
	pages: Embed[] = [];
	infoPage: Embed | null = null;
	options: RichDisplayOptions;
	protected _emojis: Cache<ReactionMethods, string> = new Cache();
	protected _template: Embed;
	protected _footered = false;
	private footerPrefix = 'Page 	';
	private footerSuffix = '';

	constructor(options: RichDisplayOptions = {}) {
		this._template = this.resolveEmbedOrCallback(options.template ?? new Embed());
		this._emojis
			.set(ReactionMethods.First, '⏮')
			.set(ReactionMethods.Back, '◀')
			.set(ReactionMethods.Jump, '↗️')
			.set(ReactionMethods.Forward, '▶')
			.set(ReactionMethods.Last, '⏭')
			.set(ReactionMethods.Info, 'ℹ')
			.set(ReactionMethods.Remove, '🗑');
		this.options = options;
		if (!(options.firstLast ?? true)) {
			this._emojis.delete(ReactionMethods.First);
			this._emojis.delete(ReactionMethods.Last);
		}
		if (!(options.jump ?? true)) this._emojis.delete(ReactionMethods.Jump);
		if (!(options.remove ?? true)) this._emojis.delete(ReactionMethods.Remove);
	}

    async run(
        client: Client,
        requestMessage: Message,
        message: Message,
        editMessage: string = '',
        options: ReactionHandlerOptions = {}
    ): Promise<ReactionHandler> {
        if (!this.infoPage) this._emojis.delete(ReactionMethods.Info);
        if (!this._footered) this.footer();
        let msg: Message;
        if (message.editable) {
            await message.edit(
                editMessage,
                !isNaN(options.startPage) && options.startPage > 0
                    ? this.pages[options.startPage]
                    : this.infoPage ?? this.pages[0]
            );
            msg = message;
        } else {
            msg = await message.channel.send(
                editMessage,
                !isNaN(options.startPage) && options.startPage > 0
                    ? this.pages[options.startPage]
                    : this.infoPage ?? this.pages[0]
            );
        }
        return new ReactionHandler(client, requestMessage, msg, options, this, this._emojis);
    }

	setEmojis(emojis: Record<ReactionMethods, string>): this {
		for (const [key, value] of Object.entries(emojis)) {
			if (this._emojis.has(key as ReactionMethods)) this._emojis.set(key as ReactionMethods, value);
		}
		return this;
	}

	setFooterPrefix(prefix: string): this {
		this._footered = false;
		this.footerPrefix = prefix;
		return this;
	}

	setFooterSuffix(suffix: string): this {
		this._footered = false;
		this.footerSuffix = suffix;
		return this;
	}

	useCustomFooters(): this {
		this._footered = true;
		return this;
	}

	addPage(embed: EmbedOrCallback): this {
		this.pages.push(this.resolveEmbedOrCallback(embed));
		return this;
	}

	setInfoPage(embed: EmbedOrCallback): this {
		this.infoPage = this.resolveEmbedOrCallback(embed);
		return this;
	}

	protected get template(): Embed {
		return new Embed(this._template);
	}

	private footer(): void {
		for (let i = 1; i <= this.pages.length; i++) this.pages[i - 1].setFooter(`${this.footerPrefix}${i} of ${this.pages.length}${this.footerSuffix}`);
		if (this.infoPage) this.infoPage.setFooter('ℹ');
	}

	private resolveEmbedOrCallback(embed: EmbedOrCallback): Embed {
		if (typeof embed === 'function') {
			const page = embed(this.template);
			if (page instanceof Embed) return page;
		} else if (embed instanceof Embed) {
			return embed;
		}
		throw new TypeError('Expected a Embed or Function returning a Embed');
	}

}
