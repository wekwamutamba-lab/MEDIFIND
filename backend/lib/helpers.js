export function paginate(query, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  return query.range(offset, offset + limit - 1);
}

export function errorResponse(res, statusCode, message) {
  if (!statusCode) statusCode = 500;
  return res.status(statusCode).json({ error: message });
}

export function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json(data);
}