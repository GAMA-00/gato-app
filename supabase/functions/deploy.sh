#!/bin/bash
# Deploy script for OnvoPay functions
echo "Deploying onvopay-authorize..."
supabase functions deploy onvopay-authorize --project-ref jckynopecuexfamepmoh

echo "Deploying onvopay-confirm..."
supabase functions deploy onvopay-confirm --project-ref jckynopecuexfamepmoh
