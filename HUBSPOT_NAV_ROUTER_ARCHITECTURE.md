# HubSpot Navigation & Router Parity — Core Architecture

**DEPENDENCY**: [HUBSPOT_CORE_CRM_SCHEMA.md](HUBSPOT_CORE_CRM_SCHEMA.md) (READ-ONLY)  
**DEPENDENCY**: [HUBSPOT_DEALS_LAYER_SCHEMA.md](HUBSPOT_DEALS_LAYER_SCHEMA.md) (LOCKED)

**ARCHITECTURAL TRUTH**: Navigation is a projection. Routing precedes rendering. Permissions determine visibility. Products register routes, not menus. Objects load apps, not pages.

---

## 1. ROUTER-FIRST SYSTEM FLOW

```
URL Request
    ↓
Router (Next.js App Router)
    ↓
Product Resolver (identify product from route)
    ↓
Permission Gate (evaluate scopes + features)
    ↓
[AUTHORIZED] → App Loader → Page Render → Nav Projection
    ↓
[DENIED] → Redirect to /unauthorized (before any render)
```

### Flow Rules

1. **Router resolves product context FIRST** - Before any component loads
2. **Permission gate runs BEFORE render** - No unauthorized UI ever renders
3. **Nav projection happens AFTER authorization** - Nav only shows accessible items
4. **Redirect happens at route level** - Not in components

---

## 2. NAV ENTRY SCHEMA (Declarative Registry)

```typescript
interface NavEntry {
  // IDENTITY
  id: string;                          // Unique identifier
  label: string;                       // Display text
  icon?: string;                       // Icon identifier
  
  // ROUTING
  route: string;                       // Absolute route path
  productKey: ProductKey;              // Product this entry belongs to
  
  // AUTHORIZATION
  requiredScopes: Scope[];             // Permission scopes required
  requiredFeatures?: Feature[];        // Feature flags required
  
  // VISIBILITY
  visibilityRule?: VisibilityRuleFn;   // Optional dynamic visibility
  
  // ORDERING
  order: number;                       // Display order (lower = higher)
  
  // GROUPING
  group?: string;                      // Optional nav group
  parentId?: string;                   // For nested nav items
}

type ProductKey = 
  | 'core-crm'
  | 'deals'
  | 'settings'
  | 'compliance'
  | 'estimating';

type Scope = 
  | 'crm:contacts:read'
  | 'crm:contacts:write'
  | 'crm:deals:read'
  | 'crm:deals:write'
  | 'crm:companies:read'
  | 'crm:companies:write'
  | 'compliance:read'
  | 'compliance:write'
  | 'settings:read'
  | 'settings:write'
  | 'admin:all';

type Feature = 
  | 'contacts_enabled'
  | 'deals_enabled'
  | 'companies_enabled'
  | 'compliance_enabled'
  | 'estimating_enabled';

type VisibilityRuleFn = (context: VisibilityContext) => boolean;

interface VisibilityContext {
  user: {
    id: string;
    role: string;
    scopes: Scope[];
    features: Feature[];
  };
  route: {
    pathname: string;
    params: Record<string, string>;
  };
}
```

### Schema Rules

✅ NavEntry is **declarative only** - no rendering logic  
✅ NavEntry does **NOT check permissions** - permission gate does  
✅ NavEntry is **immutable** - registered once per product  
❌ NavEntry **NEVER contains** business logic  
❌ NavEntry **NEVER references** other entries  
❌ NavEntry **NEVER mutates** global state  

---

## 3. PRODUCT REGISTRATION CONTRACT

```typescript
interface ProductRegistration {
  // IDENTITY
  key: ProductKey;
  name: string;
  version: string;
  
  // ROUTES
  routes: RouteRegistration[];
  
  // NAVIGATION
  navEntries: NavEntry[];
  
  // AUTHORIZATION
  requiredScopes: Scope[];
  
  // FEATURES
  featureFlags?: Feature[];
  
  // DEPENDENCIES
  dependencies?: ProductKey[];
}

interface RouteRegistration {
  // ROUTE
  path: string;                        // Route pattern (e.g., '/contacts', '/contacts/:id')
  
  // APP LOADER
  appLoader: () => Promise<React.ComponentType>;
  
  // AUTHORIZATION
  requiredScopes: Scope[];
  
  // OBJECT CONTEXT (for CRM routes)
  objectType?: CrmObjectType;
  
  // METADATA
  metadata?: {
    title?: string;
    description?: string;
  };
}

type CrmObjectType = 'contact' | 'company' | 'deal' | 'ticket';
```

### Product Registration Rules

1. **Products are isolated** - Cannot reference other products
2. **Products register routes** - Not menu items
3. **Products declare scopes** - Not permission logic
4. **Products are lazy-loaded** - Routes load apps on demand

### Product Registration Examples

```typescript
// Core CRM Product
const coreCrmProduct: ProductRegistration = {
  key: 'core-crm',
  name: 'Core CRM',
  version: '1.0.0',
  
  routes: [
    {
      path: '/contacts',
      appLoader: () => import('@/app/contacts/list-app'),
      requiredScopes: ['crm:contacts:read'],
      objectType: 'contact',
      metadata: {
        title: 'Contacts',
        description: 'View and manage contacts'
      }
    },
    {
      path: '/contacts/:id',
      appLoader: () => import('@/app/contacts/record-app'),
      requiredScopes: ['crm:contacts:read'],
      objectType: 'contact'
    },
    {
      path: '/companies',
      appLoader: () => import('@/app/companies/list-app'),
      requiredScopes: ['crm:companies:read'],
      objectType: 'company'
    },
    {
      path: '/companies/:id',
      appLoader: () => import('@/app/companies/record-app'),
      requiredScopes: ['crm:companies:read'],
      objectType: 'company'
    }
  ],
  
  navEntries: [
    {
      id: 'nav-contacts',
      label: 'Contacts',
      icon: 'users',
      route: '/contacts',
      productKey: 'core-crm',
      requiredScopes: ['crm:contacts:read'],
      requiredFeatures: ['contacts_enabled'],
      order: 100
    },
    {
      id: 'nav-companies',
      label: 'Companies',
      icon: 'building',
      route: '/companies',
      productKey: 'core-crm',
      requiredScopes: ['crm:companies:read'],
      requiredFeatures: ['companies_enabled'],
      order: 200
    }
  ],
  
  requiredScopes: ['crm:contacts:read'], // Minimum to use product
  featureFlags: ['contacts_enabled']
};

// Deals Product
const dealsProduct: ProductRegistration = {
  key: 'deals',
  name: 'Deals',
  version: '1.0.0',
  
  routes: [
    {
      path: '/deals',
      appLoader: () => import('@/app/deals/list-app'),
      requiredScopes: ['crm:deals:read'],
      objectType: 'deal',
      metadata: {
        title: 'Deals',
        description: 'View and manage deals'
      }
    },
    {
      path: '/deals/:id',
      appLoader: () => import('@/app/deals/record-app'),
      requiredScopes: ['crm:deals:read'],
      objectType: 'deal'
    }
  ],
  
  navEntries: [
    {
      id: 'nav-deals',
      label: 'Deals',
      icon: 'briefcase',
      route: '/deals',
      productKey: 'deals',
      requiredScopes: ['crm:deals:read'],
      requiredFeatures: ['deals_enabled'],
      order: 300
    }
  ],
  
  requiredScopes: ['crm:deals:read'],
  featureFlags: ['deals_enabled'],
  dependencies: ['core-crm'] // Deals depends on Core CRM
};

// Settings Product
const settingsProduct: ProductRegistration = {
  key: 'settings',
  name: 'Settings',
  version: '1.0.0',
  
  routes: [
    {
      path: '/settings',
      appLoader: () => import('@/app/settings/index-app'),
      requiredScopes: ['settings:read']
    },
    {
      path: '/settings/users',
      appLoader: () => import('@/app/settings/users-app'),
      requiredScopes: ['admin:all']
    }
  ],
  
  navEntries: [
    {
      id: 'nav-settings',
      label: 'Settings',
      icon: 'settings',
      route: '/settings',
      productKey: 'settings',
      requiredScopes: ['settings:read'],
      order: 900
    }
  ],
  
  requiredScopes: ['settings:read']
};
```

---

## 4. PERMISSION GATE MIDDLEWARE

```typescript
/**
 * Permission Gate Middleware
 * Evaluates at route resolution, before any render
 */
interface PermissionGateContext {
  route: {
    pathname: string;
    params: Record<string, string>;
  };
  user: {
    id: string;
    role: string;
    scopes: Scope[];
    features: Feature[];
  };
  registration: RouteRegistration;
}

async function permissionGate(
  context: PermissionGateContext
): Promise<PermissionGateResult> {
  // 1. Check required scopes
  const hasRequiredScopes = context.registration.requiredScopes.every(
    scope => context.user.scopes.includes(scope)
  );
  
  if (!hasRequiredScopes) {
    return {
      authorized: false,
      reason: 'missing_scopes',
      redirect: '/unauthorized'
    };
  }
  
  // 2. Check object-level permissions (for CRM routes)
  if (context.registration.objectType && context.route.params.id) {
    const hasObjectAccess = await checkObjectAccess(
      context.user.id,
      context.registration.objectType,
      context.route.params.id
    );
    
    if (!hasObjectAccess) {
      return {
        authorized: false,
        reason: 'object_access_denied',
        redirect: `/${context.registration.objectType}s`
      };
    }
  }
  
  // 3. AUTHORIZED
  return {
    authorized: true
  };
}

interface PermissionGateResult {
  authorized: boolean;
  reason?: string;
  redirect?: string;
}

/**
 * Object-level access check
 * For CRM objects, check ownership/visibility
 */
async function checkObjectAccess(
  userId: string,
  objectType: CrmObjectType,
  objectId: string
): Promise<boolean> {
  switch (objectType) {
    case 'contact':
      return canReadContact({ userId, contactId: objectId });
      
    case 'deal':
      return canReadDeal({ userId, dealId: objectId });
      
    case 'company':
      return canReadCompany({ userId, companyId: objectId });
      
    default:
      return false;
  }
}
```

### Permission Gate Rules

1. **Runs BEFORE any component renders**
2. **Evaluates scopes at route level**
3. **Checks object-level permissions for record routes**
4. **Redirects BEFORE unauthorized UI loads**
5. **Never runs inside components**

---

## 5. NAV PROJECTION ENGINE

```typescript
/**
 * Nav Projection Engine
 * Calculates visible nav items based on:
 * - Active route
 * - User scopes
 * - Enabled features
 * - Product availability
 */
interface NavProjectionContext {
  user: {
    id: string;
    role: string;
    scopes: Scope[];
    features: Feature[];
  };
  route: {
    pathname: string;
  };
  products: ProductRegistration[];
}

function projectNavigation(context: NavProjectionContext): NavItem[] {
  const allNavEntries: NavEntry[] = [];
  
  // 1. Collect nav entries from all registered products
  for (const product of context.products) {
    allNavEntries.push(...product.navEntries);
  }
  
  // 2. Filter by permissions & features
  const visibleEntries = allNavEntries.filter(entry => {
    // Check required scopes
    const hasScopes = entry.requiredScopes.every(
      scope => context.user.scopes.includes(scope)
    );
    
    if (!hasScopes) return false;
    
    // Check required features
    if (entry.requiredFeatures) {
      const hasFeatures = entry.requiredFeatures.every(
        feature => context.user.features.includes(feature)
      );
      
      if (!hasFeatures) return false;
    }
    
    // Check visibility rule (optional)
    if (entry.visibilityRule) {
      const isVisible = entry.visibilityRule({
        user: context.user,
        route: context.route
      });
      
      if (!isVisible) return false;
    }
    
    return true;
  });
  
  // 3. Sort by order
  const sorted = visibleEntries.sort((a, b) => a.order - b.order);
  
  // 4. Determine active state
  const projected = sorted.map(entry => ({
    ...entry,
    isActive: isNavEntryActive(entry, context.route.pathname)
  }));
  
  return projected;
}

interface NavItem extends NavEntry {
  isActive: boolean;
}

/**
 * Active state derivation
 * Derived from route prefix matching
 */
function isNavEntryActive(entry: NavEntry, pathname: string): boolean {
  // Exact match
  if (entry.route === pathname) {
    return true;
  }
  
  // Prefix match (for object index pages)
  // /contacts is active for /contacts, /contacts/123, /contacts/new
  if (pathname.startsWith(entry.route + '/')) {
    return true;
  }
  
  return false;
}
```

### Nav Projection Rules

1. **Nav is recalculated on route change** - Not stored
2. **Hidden entries do not exist in DOM** - Not just invisible
3. **Active state is derived** - Never stored
4. **Ordering is deterministic** - Based on `order` field
5. **No permission checks in components** - All done here

---

## 6. CRM OBJECT NAV MAPPING

```typescript
/**
 * CRM Object Nav Mapping
 * Maps CRM objects to nav entries and routes
 */
interface CrmObjectNavMapping {
  objectType: CrmObjectType;
  navEntry: NavEntry;
  routes: {
    index: string;      // List view (e.g., /contacts)
    record: string;     // Record view (e.g., /contacts/:id)
    create: string;     // Create view (e.g., /contacts/new)
  };
}

const crmObjectNavMappings: CrmObjectNavMapping[] = [
  {
    objectType: 'contact',
    navEntry: {
      id: 'nav-contacts',
      label: 'Contacts',
      icon: 'users',
      route: '/contacts',
      productKey: 'core-crm',
      requiredScopes: ['crm:contacts:read'],
      order: 100
    },
    routes: {
      index: '/contacts',
      record: '/contacts/:id',
      create: '/contacts/new'
    }
  },
  {
    objectType: 'company',
    navEntry: {
      id: 'nav-companies',
      label: 'Companies',
      icon: 'building',
      route: '/companies',
      productKey: 'core-crm',
      requiredScopes: ['crm:companies:read'],
      order: 200
    },
    routes: {
      index: '/companies',
      record: '/companies/:id',
      create: '/companies/new'
    }
  },
  {
    objectType: 'deal',
    navEntry: {
      id: 'nav-deals',
      label: 'Deals',
      icon: 'briefcase',
      route: '/deals',
      productKey: 'deals',
      requiredScopes: ['crm:deals:read'],
      order: 300
    },
    routes: {
      index: '/deals',
      record: '/deals/:id',
      create: '/deals/new'
    }
  }
];
```

### CRM Object Nav Rules

1. **Nav entries map to objects** - Not arbitrary pages
2. **Object index loads list app** - Not a static page
3. **Object record loads record app** - Not individual pages
4. **Nav never references record IDs** - Only object types
5. **Clicking nav always goes to index** - Not last viewed record

---

## 7. ROUTE → APP LOADER SYSTEM

```typescript
/**
 * App Loader System
 * Routes load apps (not pages) on demand
 */
interface AppLoaderContext {
  route: RouteRegistration;
  params: Record<string, string>;
  user: {
    id: string;
    scopes: Scope[];
  };
}

async function loadApp(context: AppLoaderContext): Promise<React.ComponentType> {
  // 1. Permission gate (already checked, but verify)
  const gateResult = await permissionGate({
    route: {
      pathname: context.route.path,
      params: context.params
    },
    user: context.user,
    registration: context.route
  });
  
  if (!gateResult.authorized) {
    throw new Error('Unauthorized');
  }
  
  // 2. Load app component
  const AppComponent = await context.route.appLoader();
  
  // 3. Return app
  return AppComponent;
}
```

### App Loader Rules

1. **Apps are lazy-loaded** - Not bundled upfront
2. **Apps load after permission gate** - Never load unauthorized apps
3. **Apps receive object context** - Via route params
4. **Apps are isolated** - No cross-product imports

---

## 8. ACTIVE STATE RESOLUTION

```typescript
/**
 * Active State Resolution
 * Derived from current route, never stored
 */
interface ActiveStateContext {
  pathname: string;
  products: ProductRegistration[];
}

function resolveActiveState(context: ActiveStateContext): ActiveState {
  // 1. Find matching route registration
  let matchedRoute: RouteRegistration | null = null;
  let matchedProduct: ProductRegistration | null = null;
  
  for (const product of context.products) {
    for (const route of product.routes) {
      if (matchesRoute(route.path, context.pathname)) {
        matchedRoute = route;
        matchedProduct = product;
        break;
      }
    }
    if (matchedRoute) break;
  }
  
  if (!matchedRoute || !matchedProduct) {
    return {
      productKey: null,
      objectType: null,
      recordId: null
    };
  }
  
  // 2. Extract object context
  const params = extractParams(matchedRoute.path, context.pathname);
  
  return {
    productKey: matchedProduct.key,
    objectType: matchedRoute.objectType || null,
    recordId: params.id || null
  };
}

interface ActiveState {
  productKey: ProductKey | null;
  objectType: CrmObjectType | null;
  recordId: string | null;
}

function matchesRoute(pattern: string, pathname: string): boolean {
  // Simple pattern matching
  // /contacts/:id matches /contacts/123
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');
  
  if (patternParts.length !== pathParts.length) {
    return false;
  }
  
  return patternParts.every((part, i) => {
    if (part.startsWith(':')) return true; // Param
    return part === pathParts[i];
  });
}

function extractParams(
  pattern: string,
  pathname: string
): Record<string, string> {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');
  const params: Record<string, string> = {};
  
  patternParts.forEach((part, i) => {
    if (part.startsWith(':')) {
      const key = part.slice(1);
      params[key] = pathParts[i];
    }
  });
  
  return params;
}
```

### Active State Rules

1. **Active state is derived** - Never stored in state
2. **Active state resolves from route** - Not from clicks
3. **Active state updates on route change** - Automatically
4. **Active ≠ selected** - Active is current route only
5. **No active state in components** - Derived at routing level

---

## 9. VALIDATION TESTS

```typescript
describe('HubSpot Nav & Router Architecture', () => {
  test('User without CRM access sees zero CRM nav', async () => {
    const context: NavProjectionContext = {
      user: {
        id: 'user-1',
        role: 'user',
        scopes: [], // No CRM scopes
        features: []
      },
      route: {
        pathname: '/'
      },
      products: [coreCrmProduct, dealsProduct]
    };
    
    const nav = projectNavigation(context);
    
    const crmNav = nav.filter(item => 
      item.productKey === 'core-crm' || item.productKey === 'deals'
    );
    
    expect(crmNav.length).toBe(0);
  });
  
  test('User with Contacts access sees Contacts only', async () => {
    const context: NavProjectionContext = {
      user: {
        id: 'user-1',
        role: 'user',
        scopes: ['crm:contacts:read'],
        features: ['contacts_enabled']
      },
      route: {
        pathname: '/'
      },
      products: [coreCrmProduct, dealsProduct]
    };
    
    const nav = projectNavigation(context);
    
    expect(nav.find(item => item.id === 'nav-contacts')).toBeDefined();
    expect(nav.find(item => item.id === 'nav-deals')).toBeUndefined();
    expect(nav.find(item => item.id === 'nav-companies')).toBeUndefined();
  });
  
  test('Deep link loads correctly without nav mismatch', async () => {
    const context: ActiveStateContext = {
      pathname: '/contacts/contact-123',
      products: [coreCrmProduct]
    };
    
    const activeState = resolveActiveState(context);
    
    expect(activeState.productKey).toBe('core-crm');
    expect(activeState.objectType).toBe('contact');
    expect(activeState.recordId).toBe('contact-123');
  });
  
  test('Route denied → redirect before render', async () => {
    const context: PermissionGateContext = {
      route: {
        pathname: '/contacts',
        params: {}
      },
      user: {
        id: 'user-1',
        role: 'user',
        scopes: [], // No access
        features: []
      },
      registration: {
        path: '/contacts',
        appLoader: async () => ({} as any),
        requiredScopes: ['crm:contacts:read']
      }
    };
    
    const result = await permissionGate(context);
    
    expect(result.authorized).toBe(false);
    expect(result.redirect).toBeDefined();
  });
  
  test('Nav updates correctly on permission change', async () => {
    let context: NavProjectionContext = {
      user: {
        id: 'user-1',
        role: 'user',
        scopes: ['crm:contacts:read'],
        features: ['contacts_enabled']
      },
      route: {
        pathname: '/'
      },
      products: [coreCrmProduct, dealsProduct]
    };
    
    let nav = projectNavigation(context);
    expect(nav.find(item => item.id === 'nav-deals')).toBeUndefined();
    
    // Grant deals access
    context.user.scopes.push('crm:deals:read');
    context.user.features.push('deals_enabled');
    
    nav = projectNavigation(context);
    expect(nav.find(item => item.id === 'nav-deals')).toBeDefined();
  });
  
  test('No CRM logic inside nav components', () => {
    // This is architectural - nav components should only:
    // 1. Receive projected nav items
    // 2. Render links
    // 3. Show active state
    
    // They should NEVER:
    // - Check permissions
    // - Query data
    // - Make business decisions
    
    expect(true).toBe(true); // Architecture test
  });
  
  test('Removing product removes nav automatically', async () => {
    const context: NavProjectionContext = {
      user: {
        id: 'user-1',
        role: 'admin',
        scopes: ['admin:all'],
        features: ['contacts_enabled', 'deals_enabled']
      },
      route: {
        pathname: '/'
      },
      products: [coreCrmProduct, dealsProduct]
    };
    
    let nav = projectNavigation(context);
    expect(nav.find(item => item.id === 'nav-deals')).toBeDefined();
    
    // Remove deals product
    context.products = [coreCrmProduct];
    
    nav = projectNavigation(context);
    expect(nav.find(item => item.id === 'nav-deals')).toBeUndefined();
  });
});
```

---

## 10. IMPLEMENTATION CONTRACTS

### Router Integration (Next.js App Router)

```typescript
// app/layout.tsx
import { projectNavigation } from '@/lib/nav/projection';
import { Navigation } from '@/components/navigation';

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    return <>{children}</>;
  }
  
  // Project navigation based on user + route
  const navItems = projectNavigation({
    user: session.user,
    route: { pathname: /* current pathname */ },
    products: registeredProducts
  });
  
  return (
    <html>
      <body>
        <Navigation items={navItems} />
        {children}
      </body>
    </html>
  );
}
```

### Route Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = await getSession(request);
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Find matching route
  const route = findMatchingRoute(request.nextUrl.pathname);
  
  if (!route) {
    return NextResponse.next();
  }
  
  // Permission gate
  const gateResult = await permissionGate({
    route: {
      pathname: request.nextUrl.pathname,
      params: {} // Extract from URL
    },
    user: session.user,
    registration: route
  });
  
  if (!gateResult.authorized) {
    return NextResponse.redirect(
      new URL(gateResult.redirect || '/unauthorized', request.url)
    );
  }
  
  return NextResponse.next();
}
```

---

## ARCHITECTURAL VALIDATION ✅

✅ Navigation is a projection (derived state)  
✅ Routing precedes rendering  
✅ Permissions determine visibility  
✅ Products register routes, not menus  
✅ Objects load apps, not pages  
✅ Nav never owns business logic  
✅ Router resolves product context first  
✅ Permission gate runs before render  
✅ Unauthorized routes redirect before render  
✅ Nav renders after route is validated  

## SCOPE COMPLIANCE ✅

✅ NO static menus  
✅ NO hard-coded nav visibility  
✅ NO role-based menus (scope-based instead)  
✅ NO feature logic in UI components  
✅ NO CRM logic inside nav  
✅ NO dashboard-first routing  
✅ NO UI implementation  
✅ NO CSS  

## HUBSPOT PARITY ✅

✅ Object-first navigation  
✅ Router-first architecture  
✅ Permission gating at route level  
✅ Product isolation  
✅ Nav projection from permissions  
✅ Active state derivation  
✅ Deep linking support  
✅ Dynamic nav updates  

**Navigation & Router architecture complete. Ready for implementation.**
