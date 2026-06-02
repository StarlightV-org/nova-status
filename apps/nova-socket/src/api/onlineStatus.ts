import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { io } from "~/socket";

export const getOnlineUsers = async (req: FastifyRequest, res: FastifyReply) => {
	const clients = await io.fetchSockets();

	const onlineUsers = new Set<string>();

	for (const client of clients) {
		Print.Debug(client.data.session.user.id);
		onlineUsers.add(client.data.session.user.id);
	}

	return res.status(200).send(Array.from(onlineUsers));
};

export const prankOverlay = async (req: FastifyRequest, res: FastifyReply) => {
	const data = z
		.object({
			userId: z.string(),
		})
		.safeParse(req.body).data;

	if (!data) {
		return res.status(400).send({ message: "Invalid request" });
	}

	if (data.userId !== "ONHHJVSL82147005") {
		io.to(data.userId).emit("prankoverlay");
	}

	return res.status(200).send({ message: "Prank overlay triggered" });
};
