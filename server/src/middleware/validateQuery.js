export function validateQuery(schema) {
  return (req, _res, next) => {
    req.validatedQuery = schema.parse(req.query);
    next();
  };
}
