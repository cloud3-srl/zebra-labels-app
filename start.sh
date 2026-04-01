#!/bin/bash
echo ""
echo "  ================================================"
echo "   Zebra Labels - Sistema Stampa Etichette"
echo "  ================================================"
echo ""
echo "  Avvio server in corso..."
echo ""
cd "$(dirname "$0")/server"
node index.js
