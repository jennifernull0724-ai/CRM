"use client"

import { useEffect } from 'react'
import styled, { createGlobalStyle } from 'styled-components'

const GlobalReset = createGlobalStyle`
  :root {
    --hubspot-navy: #1f2a44;
    --hubspot-ink: #2e3b52;
    --hubspot-ghost: #f5f7fa;
    --hubspot-sand: #faf4ed;
    --hubspot-border: #d7dde5;
    --hubspot-accent: #ff7a59;
    --hubspot-accent-strong: #ff5c3a;
    --hubspot-muted: #708198;
  }
  body.hubspot-shell-body {
    background: var(--hubspot-ghost);
    color: var(--hubspot-ink);
  }
`;

const AppViewport = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--hubspot-ghost);
  color: var(--hubspot-ink);
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
`;

const GlobalChrome = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
  background: #ffffff;
  border-bottom: 1px solid var(--hubspot-border);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
`;

const ChromeLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ChromeRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LogoMark = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: radial-gradient(circle at 30% 30%, #ff9a7a, var(--hubspot-accent));
  border: 1px solid var(--hubspot-border);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
`;

const ChromeButton = styled.button`
  border: 1px solid var(--hubspot-border);
  background: #fff;
  color: var(--hubspot-ink);
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 13px;
  min-width: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: default;
`;

const SearchShell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 260px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--hubspot-border);
  background: var(--hubspot-ghost);
`;

const LayoutShell = styled.div`
  display: grid;
  grid-template-columns: 72px 1fr;
  min-height: calc(100vh - 56px);
`;

const PrimaryRail = styled.nav`
  position: sticky;
  top: 56px;
  align-self: start;
  height: calc(100vh - 56px);
  background: #ffffff;
  border-right: 1px solid var(--hubspot-border);
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  width: 72px;
  transition: width 0.2s ease;
  &:hover {
    width: 208px;
  }
`;

const RailItem = styled.button<{ $active?: boolean }>`
  border: none;
  background: ${({ $active }) => ($active ? 'rgba(255, 122, 89, 0.12)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--hubspot-accent-strong)' : 'var(--hubspot-ink)')};
  display: grid;
  grid-template-columns: 48px 1fr;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  width: 100%;
  cursor: default;
  text-align: left;
  &:hover {
    background: ${({ $active }) => ($active ? 'rgba(255, 122, 89, 0.16)' : 'rgba(0, 0, 0, 0.03)')};
  }
`;

const RailIcon = styled.span`
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--hubspot-ghost);
  border: 1px solid var(--hubspot-border);
  font-size: 12px;
  font-weight: 700;
`;

const RailLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.2s ease;
  ${PrimaryRail}:hover & {
    opacity: 1;
  }
`;

const ContentArea = styled.main`
  display: grid;
  grid-template-rows: 52px 1fr;
  background: var(--hubspot-ghost);
  min-height: calc(100vh - 56px);
`;

const SecondaryNav = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid var(--hubspot-border);
  background: #ffffff;
  overflow-x: auto;
`;

const SecondaryItem = styled.button<{ $active?: boolean }>`
  border: none;
  background: ${({ $active }) => ($active ? 'var(--hubspot-accent)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : 'var(--hubspot-muted)')};
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: default;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 1.2fr;
  gap: 20px;
  padding: 20px;
`

const Card = styled.section`
  background: #ffffff;
  border: 1px solid var(--hubspot-border);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(18, 38, 63, 0.04);
`;

const IndexCard = styled(Card)`
  display: grid;
  grid-template-rows: auto auto 1fr;
  overflow: hidden;
`;

const RecordCard = styled(Card)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 16px;
`

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--hubspot-border);
  background: var(--hubspot-sand);
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PillButton = styled.button`
  border: 1px solid var(--hubspot-border);
  background: #ffffff;
  color: var(--hubspot-ink);
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
`;

const FilterPanel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--hubspot-border);
`;

const FilterChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--hubspot-ghost);
  color: var(--hubspot-muted);
  border: 1px dashed var(--hubspot-border);
  font-size: 12px;
`;

const EmptyTable = styled.div`
  display: grid;
  place-items: center;
  padding: 40px 16px;
  color: var(--hubspot-muted);
  font-size: 14px;
  height: 100%;
`;

const RecordHeader = styled.div`
  grid-column: span 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: var(--hubspot-ghost);
  border-radius: 10px;
  border: 1px solid var(--hubspot-border);
`;

const PropertyStack = styled.div`
  display: grid;
  gap: 12px;
`;

const PropertyCard = styled.div`
  border: 1px solid var(--hubspot-border);
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  display: grid;
  gap: 6px;
`;

const PropertyLabel = styled.div`
  font-size: 12px;
  color: var(--hubspot-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const PropertyValue = styled.div`
  min-height: 28px;
  border-radius: 8px;
  background: var(--hubspot-ghost);
  border: 1px dashed var(--hubspot-border);
`;

const TimelineWrapper = styled.div`
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 12px;
`;

const TimelineComposer = styled.div`
  border: 1px solid var(--hubspot-border);
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  display: grid;
  gap: 10px;
`;

const TimelineTabs = styled.div`
  display: flex;
  gap: 8px;
`;

const Tab = styled.button<{ $active?: boolean }>`
  border: 1px solid ${({ $active }) => ($active ? 'var(--hubspot-accent)' : 'var(--hubspot-border)')};
  background: ${({ $active }) => ($active ? 'rgba(255, 122, 89, 0.12)' : '#fff')};
  color: ${({ $active }) => ($active ? 'var(--hubspot-accent-strong)' : 'var(--hubspot-muted)')};
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
`;

const ComposerField = styled.div`
  border: 1px dashed var(--hubspot-border);
  border-radius: 10px;
  min-height: 68px;
  background: var(--hubspot-ghost);
`;

const TimelineList = styled.div`
  border: 1px solid var(--hubspot-border);
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  min-height: 220px;
  display: grid;
  gap: 10px;
`;

const TimelineEmpty = styled.div`
  padding: 24px;
  border: 1px dashed var(--hubspot-border);
  border-radius: 10px;
  text-align: center;
  color: var(--hubspot-muted);
  font-size: 13px;
`;

const AssociationPanel = styled.div`
  border: 1px solid var(--hubspot-border);
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  display: grid;
  gap: 8px;
`;

const DrawerStack = styled.div`
  position: fixed;
  top: 56px;
  right: 0;
  width: 360px;
  display: grid;
  gap: 12px;
  padding: 12px;
  z-index: 60;
`;

const Drawer = styled.div`
  border-radius: 16px 0 0 16px;
  border: 1px solid var(--hubspot-border);
  background: #fff;
  box-shadow: -8px 16px 40px rgba(18, 38, 63, 0.18);
  padding: 16px;
  display: grid;
  gap: 10px;
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
  color: var(--hubspot-ink);
`;

const DrawerField = styled.div`
  border: 1px dashed var(--hubspot-border);
  border-radius: 10px;
  height: 42px;
  background: var(--hubspot-ghost);
`;

const ModalLayer = styled.div`
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 55;
`;

const ModalBackdrop = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(2px);
`;

const ModalCard = styled.div`
  position: relative;
  pointer-events: auto;
  width: 420px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--hubspot-border);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.24);
  padding: 18px;
  display: grid;
  gap: 12px;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const ToastStack = styled.div`
  position: fixed;
  top: 72px;
  right: 20px;
  display: grid;
  gap: 8px;
  z-index: 70;
`;

const Toast = styled.div<{ $tone?: 'success' | 'error' | 'warning' }>`
  padding: 12px 14px;
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
  background: ${({ $tone }) => {
    if ($tone === 'success') return '#2e9b66'
    if ($tone === 'error') return '#e5534b'
    if ($tone === 'warning') return '#e8991d'
    return 'var(--hubspot-ink)'
  }};
`;

const Notice = styled.div`
  margin: 20px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px dashed var(--hubspot-border);
  color: var(--hubspot-muted);
  font-size: 13px;
`;

const SectionTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--hubspot-muted);
  text-transform: uppercase;
`;

const SecondaryRow = styled.div`
  display: grid;
  gap: 8px;
`;

const SplitColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const InlineNote = styled.div`
  font-size: 12px;
  color: var(--hubspot-muted);
`;

const navItems = [
  'Contacts',
  'Companies',
  'Deals',
  'Tickets',
  'Reports',
  'Automation',
  'Settings',
];

const secondaryItems = ['All records', 'Views', 'Board', 'Import', 'Export', 'Customization'];

const timelineTabs = ['Note', 'Task', 'Email', 'Call', 'Meeting', 'System'];

export function HubSpotLayoutMock() {
  useEffect(() => {
    document.body.classList.add('hubspot-shell-body')
    return () => document.body.classList.remove('hubspot-shell-body')
  }, [])

  return (
    <AppViewport data-application-name="hubspot-ui-layout-mock">
      <GlobalReset />
      <GlobalChrome>
        <ChromeLeft>
          <LogoMark aria-label="HubSpot style logo" />
          <ChromeButton aria-label="App switcher">Apps</ChromeButton>
          <SearchShell aria-label="Global search container">Search</SearchShell>
        </ChromeLeft>
        <ChromeRight>
          <ChromeButton aria-label="Notifications">Bell</ChromeButton>
          <ChromeButton aria-label="Help">?</ChromeButton>
          <ChromeButton aria-label="Settings">⚙</ChromeButton>
          <ChromeButton aria-label="Account menu">Profile</ChromeButton>
        </ChromeRight>
      </GlobalChrome>

      <LayoutShell>
        <PrimaryRail aria-label="Primary navigation">
          {navItems.map((item, index) => (
            <RailItem key={item} $active={index === 0} aria-label={item}>
              <RailIcon>{item.charAt(0)}</RailIcon>
              <RailLabel>{item}</RailLabel>
            </RailItem>
          ))}
        </PrimaryRail>

        <ContentArea>
          <SecondaryNav aria-label="Secondary navigation">
            {secondaryItems.map((item, index) => (
              <SecondaryItem key={item} $active={index === 0}>
                {item}
              </SecondaryItem>
            ))}
          </SecondaryNav>

          <MainGrid>
            <IndexCard aria-label="Object index layout">
              <Bar>
                <SectionTitle>Action bar</SectionTitle>
                <ActionGroup>
                  <PillButton aria-label="Create">Create</PillButton>
                  <PillButton aria-label="Bulk edit">Bulk actions</PillButton>
                  <PillButton aria-label="More">More</PillButton>
                </ActionGroup>
              </Bar>

              <FilterPanel>
                <FilterChip aria-label="Filters">Filters</FilterChip>
                <FilterChip aria-label="Views">Saved views</FilterChip>
                <FilterChip aria-label="Columns">Columns</FilterChip>
              </FilterPanel>

              <EmptyTable>No data yet</EmptyTable>
            </IndexCard>

            <Card aria-label="Object record page">
              <RecordHeader>
                <div>
                  <SectionTitle>Record header</SectionTitle>
                  <InlineNote>Empty state header with title space</InlineNote>
                </div>
                <ActionGroup>
                  <PillButton aria-label="Assign">Assign</PillButton>
                  <PillButton aria-label="Favorite">Favorite</PillButton>
                </ActionGroup>
              </RecordHeader>

              <PropertyStack>
                <PropertyCard>
                  <PropertyLabel>About this record</PropertyLabel>
                  <PropertyValue aria-label="Primary properties" />
                  <PropertyValue aria-label="Secondary properties" />
                </PropertyCard>
                <PropertyCard>
                  <PropertyLabel>Details</PropertyLabel>
                  <SplitColumns>
                    <PropertyValue aria-label="Detail field" />
                    <PropertyValue aria-label="Detail field" />
                  </SplitColumns>
                </PropertyCard>
              </PropertyStack>

              <TimelineWrapper>
                <TimelineComposer>
                  <TimelineTabs>
                    {timelineTabs.map((tab, index) => (
                      <Tab key={tab} $active={index === 0}>
                        {tab}
                      </Tab>
                    ))}
                  </TimelineTabs>
                  <ComposerField aria-label="Composer field" />
                  <ActionGroup>
                    <PillButton aria-label="Attach">Attach</PillButton>
                    <PillButton aria-label="Send">Send</PillButton>
                  </ActionGroup>
                </TimelineComposer>

                <TimelineList aria-label="Activity timeline">
                  <SectionTitle>Timeline</SectionTitle>
                  <TimelineEmpty>No data yet</TimelineEmpty>
                </TimelineList>

                <AssociationPanel aria-label="Associations">
                  <SectionTitle>Associations</SectionTitle>
                  <InlineNote>Linked records and teams appear here</InlineNote>
                  <PropertyValue aria-label="Association slot" />
                </AssociationPanel>
              </TimelineWrapper>
            </Card>
          </MainGrid>
        </ContentArea>
      </LayoutShell>

      <DrawerStack aria-label="Side panels">
        <Drawer>
          <DrawerHeader>
            <span>Create panel</span>
            <PillButton aria-label="Close create">X</PillButton>
          </DrawerHeader>
          <SecondaryRow>
            <DrawerField aria-label="Input slot" />
            <DrawerField aria-label="Input slot" />
          </SecondaryRow>
          <ActionGroup>
            <PillButton aria-label="Cancel create">Cancel</PillButton>
            <PillButton aria-label="Save create">Save</PillButton>
          </ActionGroup>
        </Drawer>
        <Drawer>
          <DrawerHeader>
            <span>Edit panel</span>
            <PillButton aria-label="Close edit">X</PillButton>
          </DrawerHeader>
          <SecondaryRow>
            <DrawerField aria-label="Input slot" />
            <DrawerField aria-label="Input slot" />
          </SecondaryRow>
          <ActionGroup>
            <PillButton aria-label="Cancel edit">Cancel</PillButton>
            <PillButton aria-label="Update edit">Update</PillButton>
          </ActionGroup>
        </Drawer>
        <Drawer>
          <DrawerHeader>
            <span>Log activity</span>
            <PillButton aria-label="Close log">X</PillButton>
          </DrawerHeader>
          <SecondaryRow>
            <DrawerField aria-label="Input slot" />
            <DrawerField aria-label="Input slot" />
          </SecondaryRow>
          <ActionGroup>
            <PillButton aria-label="Cancel log">Cancel</PillButton>
            <PillButton aria-label="Save log">Log</PillButton>
          </ActionGroup>
        </Drawer>
      </DrawerStack>

      <ModalLayer aria-label="Modal layer">
        <ModalBackdrop />
        <ModalCard aria-label="Confirmation modal">
          <SectionTitle>Confirmation</SectionTitle>
          <InlineNote>Blocking overlay for irreversible actions.</InlineNote>
          <ModalActions>
            <PillButton aria-label="Cancel confirm">Cancel</PillButton>
            <PillButton aria-label="Confirm action">Confirm</PillButton>
          </ModalActions>
        </ModalCard>
      </ModalLayer>

      <ToastStack aria-label="Toast notifications">
        <Toast $tone="success">Success toast UI</Toast>
        <Toast $tone="warning">Warning toast UI</Toast>
        <Toast $tone="error">Error toast UI</Toast>
      </ToastStack>

      <Notice>
        This implementation is layout-only and contains zero CRM logic or data.
      </Notice>
    </AppViewport>
  )
}
