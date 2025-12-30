#!/bin/bash
# Example shell script with various bugs

# Bug 1: Unquoted variable (will break with spaces)
file_name=$1
cat $file_name

# Bug 2: Not checking if command succeeded
mkdir /tmp/mydir
cd /tmp/mydir

# Bug 3: Using == instead of = in [ ] test
if [ "$USER" == "root" ]; then
    echo "Running as root"
fi

# Bug 4: Command substitution without quotes
files=$(ls *.txt)
for f in $files; do
    echo "Processing $f"
done

# Bug 5: Race condition - checking then using
if [ -f "/tmp/data.txt" ]; then
    cat /tmp/data.txt
fi

# Fixed: Removed dangerous eval - use safer alternatives
# If you need to run commands, use a whitelist approach or specific functions
user_input=$2
# Example: Instead of eval, handle specific cases
case "$user_input" in
    "status")
        echo "System status: OK"
        ;;
    "info")
        echo "User: $USER, PWD: $PWD"
        ;;
    *)
        echo "Error: Invalid command. Allowed: status, info" >&2
        exit 1
        ;;
esac

# Bug 7: Missing error handling
result=$(curl -s https://example.com/api)
echo $result | jq '.data'
