module.exports = {
  apps: [
    {
      name: "kest",
			script: "main.py",
			interpreter: "pipenv",
			interpreter_args: "run python",
    },
  ],
};
