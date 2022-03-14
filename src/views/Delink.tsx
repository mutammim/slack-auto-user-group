/** @jsx JSXSlack.h **/
/** @jsxFrag JSXSlack.Fragment **/

import JSXSlack, { Modal, Section } from "jsx-slack";

import { app } from "../main";

export function Delink() {
	// Identifiers, all in one place
	// These are used to identify events/actions

	const ID = {
		main: "delink-user-groups",
		page1: {
			submitted: "delink-user-groups_p1_submitted-callback",
		},
	};

	/* -------------------------------------------------------------------------- */
	/*                             Initial modal page                             */
	/* -------------------------------------------------------------------------- */

	app.shortcut(ID.main, async ({ ack, client, shortcut }) => {
		try {
			/* --------------------------- Acknowledge request -------------------------- */

			await ack();

			/* ----------------------------- Construct view ----------------------------- */

			const view = JSXSlack(
				<Modal
					title="Delink user groups"
					close="Cancel"
					submit="Continue"
					callbackId={ID.page1.submitted}
				>
					<Section>
						This modal is still under construction
						:building_construction:
					</Section>
				</Modal>
			);

			/* -------------------------------- Show view ------------------------------- */

			await client.views.open({
				// Tell Slack that this modal is connected to that shortcut
				trigger_id: shortcut.trigger_id,
				view,
			});
		} catch (error) {
			console.log(error);
		}
	});
}
