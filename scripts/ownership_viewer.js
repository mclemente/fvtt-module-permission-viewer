class OwnershipViewer {
	// Creates and applies the OwnershipViewer div to each document in a directory - called when each directory renders.
	static directoryRendered(obj, html, data) {
		if (!game.user.isGM || !obj._getEntryContextOptions) return;

		// Get the current directory's right-click context options, then tore the ownership config option
		const contextOptions = obj._getEntryContextOptions();
		const ownershipOption = contextOptions.find((e) => e.name === "OWNERSHIP.Configure");

		// Determine if we are working with a directory or a journal sheet
		const isJournalSheet = obj instanceof JournalSheet;

		// Gather all documents in the current directory or journal
		const collection = isJournalSheet ? obj.object.collections.pages : obj.constructor.collection;
		const documentList = html.find(`li.directory-item${isJournalSheet ? ".level1" : ".document"}`);

		// Interate through each directory list item.
		for (let li of documentList) {
			// Match it to the corresponding document
			li = $(li);
			const document = collection.get(li.attr(`data-${isJournalSheet ? "page" : "document"}-id`));
			const users = [];

			// Iterate through each ownership definition on the document
			for (let id in document.ownership) {
				const ownership = document.ownership[id] ?? 0;

				// If the ownership definition isn't 'None'...
				if (ownership !== CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE) {
					// Create the div for this ownership definition, with the appropriate class based on the ownership level
					const user_div = $(`<div data-user-id=${id}></div>`);

					// And if the ownership definition isn't 'All Players' (default) or a GM, set 'bg_color' to the user's color
					const user = game.users.get(id);
					if (id !== "default") {
						if (user && !user.isGM) {
							user_div.css({ "background-color": user.color });
							user_div.attr("data-tooltip", user.name);
						} else {
							continue;
						}
					}

					const ownerships = invertObject(CONST.DOCUMENT_OWNERSHIP_LEVELS);
					user_div.addClass(`ownership-viewer-${ownerships[ownership].toLowerCase()}`);
					user_div.attr(
						"data-tooltip",
						`${user ? user.name + ": " : ""} ${game.i18n.localize("OWNERSHIP." + ownerships[ownership])}`
					);
					user_div.attr("data-tooltip-direction", "UP");

					if (id == "default") {
						user_div.addClass("ownership-viewer-all");
					} else {
						user_div.addClass("ownership-viewer-user");
					}

					// Store the resulting div and keep iterating through the other ownership definitions on the document
					users.push(user_div);
				}
			}

			const div = $('<div class="ownership-viewer"></div>');

			// Append the collection of divs to the document's list item, or add the 'none set' icon if empty
			if (ownershipOption) {
				if (users.length === 0) {
					users.push($('<div><i class="fas fa-share-alt" style="color: white;"></i></div>'));
				}
				const anchor = $("<div></div>");
				div.append(anchor);
				anchor.append(...users);
			} else {
				div.append(...users);
			}

			if (isJournalSheet) {
				li.find(".page-ownership").remove();
				li.find(".page-heading").append(div);
			} else {
				li.append(div);
			}
		}

		// Ensure any clicks on the OwnershipViewer div open the ownership config for that document
		if (ownershipOption) {
			function registerClickEvents() {
				html.find(".ownership-viewer").click((event) => {
					event.preventDefault();
					event.stopPropagation();
					const li = $(event.currentTarget).closest("li");
					if (li) ownershipOption.callback(li);
				});
			}

			if (isJournalSheet) {
				// On journal sheets, delay registering click events until the page is selected and its header is expanded
				Hooks.once("renderJournalPageSheet", () => {
					registerClickEvents();
				});
			} else {
				registerClickEvents();
			}
		}
	}

	// Update the user color in OwnershipViewer divs if the user is edited
	static userUpdated(user) {
		for (let user_div of $(".ownership-viewer-user")) {
			let id = $(user_div).attr("data-user-id");
			if (id == user.id) {
				$(user_div).css("background-color", user.color);
			}
		}
	}

	// Makes the color assigned to each player clearer in the player list if they are inactive.
	static playerListRendered(list, html, options) {
		if (!options.showOffline) return;
		const userIdColorMap = game.users.contents
			.filter((user) => !user.active)
			.reduce((map, user) => {
				map[user.id] = user.color;
				return map;
			}, {});
		const players = html[0].querySelectorAll("span.player-active.inactive");
		for (let player of players) {
			const id = player.parentElement.dataset.userId;
			player.style.borderColor = userIdColorMap[id];
		}
	}
}

Hooks.on("renderJournalSheet", OwnershipViewer.directoryRendered);
Hooks.on("renderJournalDirectory", OwnershipViewer.directoryRendered);
Hooks.on("renderSceneDirectory", OwnershipViewer.directoryRendered);
Hooks.on("renderActorDirectory", OwnershipViewer.directoryRendered);
Hooks.on("renderItemDirectory", OwnershipViewer.directoryRendered);
Hooks.on("renderMacroDirectory", OwnershipViewer.directoryRendered);
Hooks.on("renderRollTableDirectory", OwnershipViewer.directoryRendered);
Hooks.on("renderCardsDirectory", OwnershipViewer.directoryRendered);
Hooks.on("updateUser", OwnershipViewer.userUpdated);
Hooks.on("renderPlayerList", OwnershipViewer.playerListRendered);
