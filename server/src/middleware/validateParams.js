export function validateParams(schema) {
  return (req, _res, next) => {
    req.validatedParams = schema.parse(req.params);
    next();
  };
}
