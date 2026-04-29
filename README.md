# Task-tracker

### Why JSON?
Since command-line applications finish their execution immediately after a task is performed, any data stored in variables is lost. To ensure tasks persist between sessions, this tool uses JSON as a lightweight database. This allows the application to map complex Go structures like IDs, timestamps, and task descriptions into a readable text format on your hard drive. This ensures your data is saved and easily retrievable every time you run a command.
