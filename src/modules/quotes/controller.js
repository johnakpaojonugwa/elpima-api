import * as quoteService from "./service.js";
import { successResponse, paginatedResponse } from "../../utils/response.js";

export async function createQuote(request, response, nextFunction) {
  try {
    const result = await quoteService.createQuote(request.body);
    return successResponse(response, {
      statusCode: 201,
      message: "Quote inquiry received successfully. Redirecting to WhatsApp.",
      data: result,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function listQuotes(request, response, nextFunction) {
  try {
    const { total, page, limit, quotes } = await quoteService.listQuotes(request.query);
    return paginatedResponse(response, {
      data: quotes,
      total,
      page,
      limit,
      message: "Quote inquiries retrieved successfully",
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getQuoteByReference(request, response, nextFunction) {
  try {
    const quote = await quoteService.getQuoteByReference(request.params.reference);
    return successResponse(response, {
      message: "Quote inquiry retrieved successfully",
      data: quote,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function downloadQuotePdf(request, response, nextFunction) {
  try {
    const quote = await quoteService.getQuoteByReference(request.params.reference);
    const settings = await quoteService.getStoreSettings();

    const pdfDocument = (await import("../../utils/pdfGenerator.js")).generateQuotePdf(quote, settings);

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="Elpima_Quote_${quote.reference}.pdf"`
    );

    pdfDocument.pipe(response);
    pdfDocument.end();
  } catch (error) {
    nextFunction(error);
  }
}

export async function updateQuoteStatus(request, response, nextFunction) {
  try {
    const quote = await quoteService.updateQuoteStatus(request.params.id, request.body, request.user);
    return successResponse(response, {
      message: "Quote status updated successfully",
      data: quote,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function assignQuote(request, response, nextFunction) {
  try {
    const quote = await quoteService.assignQuote(request.params.id, request.body, request.user);
    return successResponse(response, {
      message: "Quote assigned successfully",
      data: quote,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function getQuoteStats(_request, response, nextFunction) {
  try {
    const stats = await quoteService.getQuoteStats();
    return successResponse(response, {
      message: "Quote metrics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    nextFunction(error);
  }
}

export async function deleteQuote(request, response, nextFunction) {
  try {
    const clientInfo = { ip: request.ip, userAgent: request.headers["user-agent"] };
    const result = await quoteService.deleteQuote(request.params.id, request.user, clientInfo);
    return successResponse(response, {
      message: result.message,
    });
  } catch (error) {
    nextFunction(error);
  }
}
