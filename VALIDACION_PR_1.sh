#!/bin/bash

# ========================================
# PR #1 - Script de Validación Final
# ========================================
# Este script verifica que PR #1 cumple todos los criterios

echo "🔍 ===== VALIDACIÓN PR #1: UNIFIED LOGGING ====="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# ========================================
# 1. Verificar que archivos migrados no tienen console.*
# ========================================
echo "📋 1. Verificando archivos migrados..."

MIGRATED_FILES=(
  "src/contexts/AuthContext.tsx"
  "src/contexts/AvailabilityContext.tsx"
  "src/contexts/UnifiedAvailabilityContext.tsx"
  "src/contexts/auth/useAuthActions.ts"
  "src/contexts/auth/useAuthState.ts"
  "src/contexts/auth/utils.ts"
  "src/pages/Register.tsx"
  "src/pages/ProviderRegister.tsx"
  "src/components/dashboard/AppointmentCard.tsx"
  "src/components/dashboard/AppointmentList.tsx"
  "src/components/dashboard/DashboardErrorState.tsx"
  "src/components/client/service/ProviderCertifications.tsx"
  "src/components/client/service/ProviderInfoCard.tsx"
  "src/components/provider/PostPaymentInvoicing.tsx"
  "src/components/provider/PostPaymentPricing.tsx"
)

for file in "${MIGRATED_FILES[@]}"; do
  if [ -f "$file" ]; then
    COUNT=$(grep -c "console\." "$file" 2>/dev/null || echo "0")
    if [ "$COUNT" -gt "0" ]; then
      echo -e "${RED}❌ FALLO: $file contiene $COUNT console.* statements${NC}"
      ERRORS=$((ERRORS + 1))
    else
      echo -e "${GREEN}✅ $file - limpio${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  WARNING: $file no encontrado${NC}"
  fi
done

echo ""

# ========================================
# 2. Verificar archivos DO_NOT_CHANGE_BEHAVIOR intactos
# ========================================
echo "🔒 2. Verificando archivos protegidos (DO_NOT_CHANGE_BEHAVIOR)..."

PROTECTED_FILES=(
  "src/utils/robustBookingSystem.ts"
  "src/contexts/AuthContext.tsx"
)

for file in "${PROTECTED_FILES[@]}"; do
  if [ -f "$file" ]; then
    if grep -q "DO_NOT_CHANGE_BEHAVIOR" "$file"; then
      echo -e "${GREEN}✅ $file - marker presente${NC}"
    else
      echo -e "${RED}❌ FALLO: $file perdió marker DO_NOT_CHANGE_BEHAVIOR${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo -e "${YELLOW}⚠️  WARNING: $file no encontrado${NC}"
  fi
done

echo ""

# ========================================
# 3. Ejecutar ESLint
# ========================================
echo "🔍 3. Ejecutando ESLint..."
if npm run lint > /tmp/lint_output.txt 2>&1; then
  echo -e "${GREEN}✅ ESLint - Sin errores${NC}"
else
  echo -e "${RED}❌ FALLO: ESLint encontró errores${NC}"
  echo "Primeros 20 errores:"
  head -20 /tmp/lint_output.txt
  ERRORS=$((ERRORS + 1))
fi

echo ""

# ========================================
# 4. Ejecutar Build
# ========================================
echo "🏗️  4. Ejecutando Build..."
if npm run build > /tmp/build_output.txt 2>&1; then
  echo -e "${GREEN}✅ Build - Exitoso${NC}"
else
  echo -e "${RED}❌ FALLO: Build falló${NC}"
  echo "Últimas 20 líneas:"
  tail -20 /tmp/build_output.txt
  ERRORS=$((ERRORS + 1))
fi

echo ""

# ========================================
# 5. Verificar que logger.ts existe y tiene console permitido
# ========================================
echo "📝 5. Verificando logger.ts..."
if [ -f "src/utils/logger.ts" ]; then
  echo -e "${GREEN}✅ src/utils/logger.ts - existe${NC}"
  
  if grep -q "console\." "src/utils/logger.ts"; then
    echo -e "${GREEN}✅ logger.ts - contiene console.* (correcto)${NC}"
  else
    echo -e "${RED}❌ FALLO: logger.ts no contiene console.*${NC}"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo -e "${RED}❌ FALLO: src/utils/logger.ts no existe${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# ========================================
# 6. Verificar ESLint config
# ========================================
echo "⚙️  6. Verificando ESLint config..."
if [ -f "eslint.config.js" ]; then
  if grep -q '"no-console"' "eslint.config.js"; then
    echo -e "${GREEN}✅ eslint.config.js - regla no-console presente${NC}"
  else
    echo -e "${RED}❌ FALLO: eslint.config.js no tiene regla no-console${NC}"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo -e "${RED}❌ FALLO: eslint.config.js no existe${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# ========================================
# 7. Contar console.* restantes (informativo)
# ========================================
echo "📊 7. Estadísticas de console.* restantes..."
TOTAL_CONSOLE=$(git grep -n "console\." src/ | grep -v "logger.ts" | wc -l 2>/dev/null || echo "0")
echo "Total console.* en src/ (excluyendo logger.ts): $TOTAL_CONSOLE"
echo -e "${YELLOW}ℹ️  Estos serán migrados en PR #1.5${NC}"

echo ""

# ========================================
# RESUMEN FINAL
# ========================================
echo "========================================="
echo "📋 RESUMEN DE VALIDACIÓN"
echo "========================================="

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}"
  echo "██████████████████████████████████████████"
  echo "  ✅ TODAS LAS VALIDACIONES PASARON"
  echo "  PR #1 LISTO PARA MERGE"
  echo "██████████████████████████████████████████"
  echo -e "${NC}"
  exit 0
else
  echo -e "${RED}"
  echo "██████████████████████████████████████████"
  echo "  ❌ $ERRORS VALIDACIÓN(ES) FALLARON"
  echo "  REVISAR ERRORES ARRIBA"
  echo "██████████████████████████████████████████"
  echo -e "${NC}"
  exit 1
fi
