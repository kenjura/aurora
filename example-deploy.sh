#!/bin/bash

# Source directory
SOURCE_DIR="$HOME/my-wiki/"

# Destination server details
DEST_USER="my-user"
DEST_SERVER="127.0.0.1"
DEST_DIR="/home/my-user/my-wiki"

# SSH key file
SSH_KEY="$HOME/.ssh/my-server.pem"

# Rsync command
rsync -avz -e "ssh -i $SSH_KEY" "$SOURCE_DIR" "$DEST_USER@$DEST_SERVER:$DEST_DIR"
