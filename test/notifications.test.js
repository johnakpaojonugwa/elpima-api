import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import * as notificationService from "../src/modules/notifications/service.js";
import { handleSSEConnection } from "../src/modules/notifications/sse.js";

describe("Notifications Module & Real-time SSE", () => {
  const app = createApp();

  const mockUser = {
    id: "a0000000-0000-0000-0000-000000000001",
    email: "admin@elpima.com",
    fullName: "Chief Surgeon",
    role: "SUPER_ADMIN",
    isActive: true,
    tokenVersion: 0,
  };

  const validToken = jwt.sign(
    { sub: mockUser.id, email: mockUser.email, role: mockUser.role, tokenVersion: 0 },
    env.JWT_SECRET,
    { algorithm: "HS256" }
  );

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);
  });

  describe("formatNotificationForUi", () => {
    it("formats notification fields matching the frontend NotificationItem contract", () => {
      const now = new Date();
      const rawNotification = {
        id: "notif-uuid-1",
        userId: mockUser.id,
        category: "GENERAL",
        iconType: "URGENT",
        title: "Urgent Hospital RFQ Submitted",
        description: "Cedarcrest Hospital requested 5 surgical trays",
        isRead: false,
        metadata: { ref: "ELP-202610-1234" },
        createdAt: now,
        updatedAt: now,
      };

      const formatted = notificationService.formatNotificationForUi(rawNotification);

      expect(formatted.id).toBe("notif-uuid-1");
      expect(formatted.category).toBe("general");
      expect(formatted.iconType).toBe("urgent");
      expect(formatted.day).toBe("Today");
      expect(formatted.timestamp).toBe("Just Now");
      expect(formatted.isRead).toBe(false);
      expect(formatted.title).toBe("Urgent Hospital RFQ Submitted");
    });

    it("correctly maps SYSTEM_DB and SYSTEM_SHIELD to hyphenated iconTypes", () => {
      const formattedDb = notificationService.formatNotificationForUi({
        id: "db-1",
        category: "SYSTEM",
        iconType: "SYSTEM_DB",
        title: "Database Backup Completed",
        description: "Daily automated backup succeeded",
        isRead: true,
        createdAt: new Date(),
      });

      const formattedShield = notificationService.formatNotificationForUi({
        id: "shield-1",
        category: "SYSTEM",
        iconType: "SYSTEM_SHIELD",
        title: "Zero-Trust Security Verification",
        description: "Audit signatures verified",
        isRead: true,
        createdAt: new Date(),
      });

      expect(formattedDb.category).toBe("system");
      expect(formattedDb.iconType).toBe("system-db");
      expect(formattedShield.iconType).toBe("system-shield");
    });
  });

  describe("Service layer methods", () => {
    it("createNotification should persist to database with uppercase enums", async () => {
      const mockRecord = {
        id: "new-notif-uuid",
        userId: null,
        category: "GENERAL",
        iconType: "QUOTE",
        title: "Proforma Quote Dispatched",
        description: "Dispatched via WhatsApp",
        isRead: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(prisma.notification, "create").mockResolvedValue(mockRecord);

      const result = await notificationService.createNotification({
        category: "general",
        iconType: "quote",
        title: "Proforma Quote Dispatched",
        description: "Dispatched via WhatsApp",
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: null,
          category: "GENERAL",
          iconType: "QUOTE",
          title: "Proforma Quote Dispatched",
          description: "Dispatched via WhatsApp",
          metadata: null,
        },
      });

      expect(result.id).toBe("new-notif-uuid");
      expect(result.category).toBe("general");
      expect(result.iconType).toBe("quote");
    });

    it("listNotifications should support category filtering and return unreadCount", async () => {
      vi.spyOn(prisma.notification, "count")
        .mockResolvedValueOnce(1) // total filtered count
        .mockResolvedValueOnce(3); // unreadCount

      vi.spyOn(prisma.notification, "findMany").mockResolvedValue([
        {
          id: "notif-1",
          userId: null,
          category: "GENERAL",
          iconType: "QUOTE",
          title: "New Hospital RFQ",
          description: "Lagoon Specialist Hospital",
          isRead: false,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await notificationService.listNotifications({
        user: mockUser,
        page: 1,
        limit: 10,
        category: "general",
      });

      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(3);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].category).toBe("general");
    });

    it("markNotificationAsRead should set isRead to true", async () => {
      vi.spyOn(prisma.notification, "findFirst").mockResolvedValue({
        id: "notif-uuid-1",
        userId: mockUser.id,
      });

      vi.spyOn(prisma.notification, "update").mockResolvedValue({
        id: "notif-uuid-1",
        userId: mockUser.id,
        category: "GENERAL",
        iconType: "QUOTE",
        title: "Test Notification",
        description: "Test Desc",
        isRead: true,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await notificationService.markNotificationAsRead("notif-uuid-1", mockUser, true);
      expect(updated.isRead).toBe(true);
    });

    it("markAllNotificationsAsRead should update all unread records", async () => {
      vi.spyOn(prisma.notification, "updateMany").mockResolvedValue({ count: 5 });

      const result = await notificationService.markAllNotificationsAsRead(mockUser, { category: "general" });
      expect(result.updatedCount).toBe(5);
    });
  });

  describe("REST Endpoints & SSE Authentication", () => {
    it("GET /api/v1/notifications requires authentication", async () => {
      const res = await request(app).get("/api/v1/notifications");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("GET /api/v1/notifications returns 200 with Bearer authorization", async () => {
      vi.spyOn(prisma.notification, "count")
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      vi.spyOn(prisma.notification, "findMany").mockResolvedValue([]);

      const res = await request(app)
        .get("/api/v1/notifications?category=general")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications).toBeInstanceOf(Array);
      expect(res.body.meta.pagination).toBeDefined();
    });

    it("GET /api/v1/notifications/unread-count returns unread count", async () => {
      vi.spyOn(prisma.notification, "count").mockResolvedValue(4);

      const res = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBe(4);
    });

    it("handleSSEConnection sets up text/event-stream headers and emits connected event", () => {
      let writtenData = "";
      const mockReq = new EventEmitter();
      mockReq.user = mockUser;

      const mockRes = {
        writeHead: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn((data) => {
          writtenData += data;
        }),
      };

      handleSSEConnection(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        })
      );
      expect(writtenData).toContain("event: connected");
      mockReq.emit("close");
    });

    it("requireAuth extracts token from ?token= query parameter for EventSource SSE compatibility on stream route", async () => {
      const { requireAuth } = await import("../src/middlewares/auth.js");
      const req = {
        headers: {},
        path: "/stream",
        query: { token: validToken },
      };
      const res = {};
      const next = vi.fn();

      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(mockUser.id);
    });

    it("requireAuth rejects ?token= query parameter on non-stream routes to prevent token leakage in URL logs", async () => {
      const { requireAuth } = await import("../src/middlewares/auth.js");
      const req = {
        headers: {},
        path: "/quotes",
        query: { token: validToken },
      };
      const res = {};
      const next = vi.fn();

      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain("Authentication token required");
    });
  });
});
