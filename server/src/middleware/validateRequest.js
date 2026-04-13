export function validateRequest(schema) {
  return (req, _res, next) => {
    req.validatedData = schema.parse(req.body);
    next();
  };
}

