import { relations, sql } from "drizzle-orm";
import * as t from "drizzle-orm/pg-core";
// @ts-ignore
import type { Config } from "better-auth";
// @ts-ignore
import { generateShortId } from "@novastatus/lib";
import { MONITOR_SCHEMA, MONITOR_TYPES_LIST } from "@novastatus/lib/monitorTypes.ts";
import z from "zod";



export const novaTable = t.pgTableCreator((name) => `nova_${name}`);

export type DbUser = typeof users.$inferSelect;

// MARK: "users"
export const users = novaTable("users", {
  id: t.varchar("id", { length: 255 }).primaryKey().unique().$defaultFn(() => generateShortId(16)),
  name: t.varchar("name", { length: 255 }).notNull(),
  email: t.varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: t.boolean("email_verified").notNull().default(false),
  image: t.varchar("image", { length: 255 }),
  createdAt: t.timestamp("created_at").notNull().defaultNow(),
  updatedAt: t.timestamp("updated_at").notNull().defaultNow(),
  banner: t.varchar("banner", { length: 255 }),
  admin: t.boolean("admin").default(false),
  staff: t.boolean("staff").default(true),
  role: t.text("role"),

  accountActive: t.boolean("accountActive").default(false).notNull(),
  accountLocked: t.boolean("accountLocked").default(false).notNull(),

  config: t.json("config").notNull().default({}).$type<Config>(),
  discordId: t.varchar("discord_id", { length: 255 }),
  fivemLicense: t.varchar("fivem_license", { length: 255 }).unique(),
  team: t.varchar("team", { length: 255 }),
  lastActive: t.timestamp("last_active", { withTimezone: true }).defaultNow(),
});

export const usersRelations = relations(users, ({ many, }) => ({
  accounts: many(accounts),
  session: many(sessions),
  passkeys: many(passkeys),
  verifications: many(verifications),

}));

// MARK: "accounts"
export const accounts = novaTable("accounts", {
  id: t.text("id").primaryKey().$defaultFn(() => generateShortId(16)),
  accountId: t.text("account_id").notNull(),
  providerId: t.text("provider_id").notNull(),
  userId: t
    .text("user_id")
    .notNull()
    .references(() => users.id),
  accessToken: t.text("access_token"),
  refreshToken: t.text("refresh_token"),
  idToken: t.text("id_token"),
  accessTokenExpiresAt: t.timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: t.timestamp("refresh_token_expires_at"),
  scope: t.text("scope"),
  password: t.text("password"),
  createdAt: t.timestamp("created_at").notNull(),

  updatedAt: t.timestamp("updated_at").notNull(),
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// MARK: "sessions"
export const sessions = novaTable("sessions", {
  id: t.text("id").primaryKey().$defaultFn(() => generateShortId(16)),
  expiresAt: t.timestamp("expires_at").notNull(),
  token: t.text("token").notNull().unique(),
  createdAt: t.timestamp("created_at").notNull(),
  updatedAt: t.timestamp("updated_at").notNull(),
  ipAddress: t.text("ip_address"),

  userAgent: t.text("user_agent"),
  userId: t
    .text("user_id")
    .notNull()
    .references(() => users.id),
  impersonatedBy: t.text("impersonated_by"),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
    relationName: "user_sessions",
  }),
}));

// MARK: "verification_token"
export const verificationTokens = novaTable("verification_token", {
  identifier: t.varchar("identifier", { length: 255 }).notNull().$defaultFn(() => generateShortId(16)),
  token: t.varchar("token", { length: 255 }).notNull(),
  expires: t
    .timestamp("expires", {
      mode: "date",
      withTimezone: true,
    })
    .notNull(),
});

// MARK: "passkeys"
export const passkeys = novaTable("passkeys", {
  id: t.text("id").primaryKey().$defaultFn(() => generateShortId(16)),
  name: t.text("name"),
  publicKey: t.text("public_key").notNull(),
  userId: t
    .text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credentialID: t.text("credential_i_d").notNull(),
  counter: t.integer("counter").notNull(),
  deviceType: t.text("device_type").notNull(),
  backedUp: t.boolean("backed_up").notNull(),
  transports: t.text("transports"),
  createdAt: t.timestamp("created_at"),
  aaguid: t.text("aaguid"),
});

// MARK: "verifications"
export const verifications = novaTable("verifications", {
  id: t.text("id").primaryKey().$defaultFn(() => generateShortId(16)),
  identifier: t.text("identifier").notNull(),
  value: t.text("value").notNull(),
  expiresAt: t.timestamp("expires_at").notNull(),
  createdAt: t.timestamp("created_at"),
  updatedAt: t.timestamp("updated_at"),
});



// MONITORS


export type MonitorDB = typeof monitors.$inferSelect;

export const monitors = novaTable("monitors", {
  id: t.text("id").primaryKey().$defaultFn(() => generateShortId(16)),
  label: t.text("label").notNull(),

  type: t.varchar("type", { enum: MONITOR_TYPES_LIST }).notNull(),
  data: t.json().notNull().default({}),
  interval: t.integer("interval").notNull().default(60),
  groupId: t.text("group_id"),

});

export type MonitorStatusDB = typeof monitorStatus.$inferSelect;

export const monitorStatus = novaTable("monitor_status", {
  id: t.text("id").primaryKey().$defaultFn(() => generateShortId(16)),
  monitorId: t.text("monitor_id").notNull().references(() => monitors.id, { onDelete: "cascade" }),
  status: t.varchar("status", { enum: ["up", "down",  "pending", "maintenance"] }).notNull(),
  responseTime: t.integer("response_time"),
  message: t.text("message"),
  checkedAt: t.timestamp("checked_at").notNull(),
});



export const monitorRelation = relations(monitors, ({ many }) => ({
  status: many(monitorStatus),
}));

export const monitorStatusRelation = relations(monitorStatus, ({ one }) => ({
  monitor: one(monitors, {
    fields: [monitorStatus.monitorId],
    references: [monitors.id],
  }),
}));
