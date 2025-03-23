# Terminal Tools

This document covers the terminal-related tools provided by Claude Desktop Commander.

## Available Tools

### execute_command
Run commands with configurable timeout.

**Usage:**
```javascript
execute_command({ command: "ls -la", timeout_ms: 5000 })
```

**Parameters:**
- `command` (string): The command to execute
- `timeout_ms` (number, optional): Timeout in milliseconds

**Returns:**
- Output from the command execution
- Process ID (pid) for long-running commands

### read_output
Get output from long-running commands.

**Usage:**
```javascript
read_output({ pid: 12345 })
```

**Parameters:**
- `pid` (number): Process ID of the running command

**Returns:**
- New output since the last read

### force_terminate
Stop running command sessions.

**Usage:**
```javascript
force_terminate({ pid: 12345 })
```

**Parameters:**
- `pid` (number): Process ID of the command to terminate

### list_sessions
View active command sessions.

**Usage:**
```javascript
list_sessions({})
```

**Returns:**
- List of active command sessions with their PIDs

### list_processes
View system processes.

**Usage:**
```javascript
list_processes({})
```

**Returns:**
- List of running processes including PID, command name, CPU usage, and memory usage

### kill_process
Terminate processes by PID.

**Usage:**
```javascript
kill_process({ pid: 12345 })
```

**Parameters:**
- `pid` (number): Process ID to terminate

### block_command / unblock_command
Manage command blacklist.

**Usage:**
```javascript
block_command({ command: "rm -rf" })
unblock_command({ command: "rm -rf" })
```

**Parameters:**
- `command` (string): Command pattern to block/unblock

## Security Considerations

- Use `block_command` to prevent potentially harmful commands
- Always validate user input before executing commands
- Consider running with restricted permissions when possible
