#!/bin/sh
set -e

rm -rf \
	node_modules/next \
	node_modules/react \
	node_modules/react-dom \
	node_modules/@next \
	node_modules/lucide-react \
	node_modules/motion \
	node_modules/recharts \
	node_modules/radix-ui \
	node_modules/tailwindcss \
	node_modules/@tailwindcss \
	node_modules/shadcn \
	node_modules/sonner \
	node_modules/socket.io \
	node_modules/socket.io-client \
	node_modules/fastify \
	node_modules/@fastify \
	node_modules/better-auth \
	node_modules/@better-auth \
	node_modules/@auth \
	node_modules/@tanstack \
	node_modules/@trpc \
	node_modules/turbo \
	node_modules/typescript \
	node_modules/@biomejs \
	node_modules/prettier \
	node_modules/babel-plugin-react-compiler \
	apps \
	/root/.bun/install/cache
