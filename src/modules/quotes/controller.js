import * as quoteService from "./service.js";
import { successResponse, paginatedResponse } from "../../utils/response.js";

export async function createQuote(req, res, next) {
  try {
    const result = await quoteService.createQuote(req.body);
    return successResponse(res, {
      statusCode: 201,
      message: "Quote inquiry received successfully. Redirecting to WhatsApp.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function listQuotes(req, res, next) {
  try {
    const { total, page, limit, quotes } = await quoteService.listQuotes(req.query);
    return paginatedResponse(res, {
      data: quotes,
      total,
      page,
      limit,
      message: "Quote inquiries retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuoteByReference(req, res, next) {
  try {
    const quote = await quoteService.getQuoteByReference(req.params.reference);
    return successResponse(res, {
      message: "Quote inquiry retrieved successfully",
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadQuotePdf(req, res, next) {
  try {
    const quote = await quoteService.getQuoteByReference(req.params.reference);
    const settings = await quoteService.getStoreSettings();

    const doc = (await import("../../utils/pdfGenerator.js")).generateQuotePdf(quote, settings);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Elpima_Quote_${quote.reference}.pdf"`
    );

    doc.pipe(res);
    doc.end();
  } catch (error) {
    next(error);
  }
}

export async function updateQuoteStatus(req, res, next) {
  try {
    const quote = await quoteService.updateQuoteStatus(req.params.id, req.body, req.user);
    return successResponse(res, {
      message: "Quote status updated successfully",
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

export async function assignQuote(req, res, next) {
  try {
    const quote = await quoteService.assignQuote(req.params.id, req.body, req.user);
    return successResponse(res, {
      message: "Quote assigned successfully",
      data: quote,
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuoteStats(_req, res, next) {
  try {
    const stats = await quoteService.getQuoteStats();
    return successResponse(res, {
      message: "Quote metrics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuote(req, res, next) {
  try {
    const clientInfo = { ip: req.ip, userAgent: req.headers["user-agent"] };
    const result = await quoteService.deleteQuote(req.params.id, req.user, clientInfo);
    return successResponse(res, {
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}
