module.exports = (err) => {
  console.log("UNCAUGHT EXCEPTION!!! shutting down...");
  console.log(err.name, err.message, err);
  process.exit(1);
};
