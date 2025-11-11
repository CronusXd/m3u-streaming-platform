# Implementation Plan - Netflix-Style UI Redesign

- [ ] 1. Setup base theme and color system
  - Update tailwind.config.ts with Netflix-inspired color palette (black: #0a0a0a, darkGray: #141414, netflixRed: #E50914)
  - Add custom animation timing functions (ease-out-expo, ease-in-out-quart)
  - Configure responsive breakpoints for card sizes
  - Update globals.css with Netflix dark theme variables
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 2. Create NetflixLayout component
  - [ ] 2.1 Implement NetflixLayout component replacing DashboardLayout
    - Create frontend/src/components/layouts/NetflixLayout.tsx
    - Remove sidebar, implement full-width layout with black background
    - Add children rendering with proper spacing
    - _Requirements: 1.1, 4.1_
  
  - [ ] 2.2 Create NetflixHeader component with scroll behavior
    - Create frontend/src/components/layouts/NetflixHeader.tsx
    - Implement fixed positioning with transparent-to-solid transition on scroll
    - Add logo, navigation menu, search icon, and user menu
    - Implement scroll detection with useEffect and state management
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 2.3 Update dashboard layout to use NetflixLayout
    - Modify frontend/src/app/dashboard/layout.tsx to use NetflixLayout
    - Remove old sidebar navigation code
    - _Requirements: 5.1_

- [ ] 3. Implement ChannelCard component with hover effects
  - [ ] 3.1 Create base ChannelCard component
    - Create frontend/src/components/channels/ChannelCard.tsx
    - Implement 16:9 aspect ratio container
    - Add image rendering with fallback placeholder
    - Add HLS/HD badge display
    - _Requirements: 3.1, 3.6_
  
  - [ ] 3.2 Add hover interactions and overlay
    - Implement hover state with scale(1.1) transform
    - Create overlay with gradient background
    - Add title, category, and action buttons in overlay
    - Implement smooth transitions (300ms ease-out-expo)
    - _Requirements: 3.2, 3.3, 7.2_
  
  - [ ] 3.3 Integrate favorite toggle functionality
    - Add favorite button with heart icon
    - Connect to useFavorites hook
    - Implement optimistic UI updates
    - _Requirements: 3.3, 3.4_

- [ ] 4. Build CategoryCarousel component
  - [ ] 4.1 Create carousel container and track
    - Create frontend/src/components/channels/CategoryCarousel.tsx
    - Implement horizontal scroll container with hidden scrollbar
    - Add category title header
    - Setup flex layout for channel cards with gap
    - _Requirements: 2.1, 2.4_
  
  - [ ] 4.2 Implement navigation buttons
    - Add left and right arrow buttons
    - Implement scroll logic with smooth behavior
    - Add visibility logic (hide left arrow at start, right arrow at end)
    - Add hover opacity transition for buttons
    - _Requirements: 2.2, 2.6, 2.7_
  
  - [ ] 4.3 Add scroll position tracking
    - Implement scroll event listener with throttling
    - Track canScrollLeft and canScrollRight states
    - Update button visibility based on scroll position
    - _Requirements: 2.2, 2.6, 2.7_
  
  - [ ] 4.4 Integrate lazy loading for channels
    - Add intersection observer for load more trigger
    - Implement onLoadMore callback prop
    - Add loading indicator at end of carousel
    - _Requirements: 2.4_

- [ ] 5. Create HeroBanner component
  - [ ] 5.1 Build hero banner structure
    - Create frontend/src/components/home/HeroBanner.tsx
    - Implement 80vh height container
    - Add background image with gradient overlay
    - Position content in bottom-left with max-width 500px
    - _Requirements: 1.1, 1.5_
  
  - [ ] 5.2 Add channel information display
    - Display channel logo or title
    - Show category name
    - Add description text (if available)
    - Style with white text and proper hierarchy
    - _Requirements: 1.1, 1.5_
  
  - [ ] 5.3 Implement action buttons
    - Add "Assistir" button with play icon
    - Add "Mais Informações" button with info icon
    - Style buttons with Netflix-style (white bg for primary, gray for secondary)
    - Connect buttons to onPlay and onMoreInfo callbacks
    - _Requirements: 1.3, 1.4_
  
  - [ ] 5.4 Add hover animations
    - Implement subtle scale animation on button hover
    - Add fade-in animation on component mount
    - _Requirements: 1.2, 7.1_

- [ ] 6. Implement VideoPlayerModal component
  - [ ] 6.1 Create modal structure
    - Create frontend/src/components/player/VideoPlayerModal.tsx
    - Implement fullscreen fixed overlay with dark backdrop
    - Add close button (X) in top-right corner
    - Setup modal content container with max-width 1400px
    - _Requirements: 6.1, 6.6_
  
  - [ ] 6.2 Integrate VideoPlayer component
    - Embed existing VideoPlayer component
    - Add 16:9 aspect ratio container
    - Pass channel stream_url and title
    - _Requirements: 6.2_
  
  - [ ] 6.3 Add channel information section
    - Display channel title, category, and HLS badge below player
    - Add description if available
    - Style with Netflix typography
    - _Requirements: 6.2_
  
  - [ ] 6.4 Implement related channels section
    - Add "Canais Relacionados" heading
    - Display horizontal row of related channel cards
    - Filter channels by same category
    - _Requirements: 6.2_
  
  - [ ] 6.5 Add modal animations
    - Implement scale-in animation on open
    - Add fade-out animation on close
    - Handle escape key to close modal
    - _Requirements: 6.6, 7.4_
  
  - [ ] 6.6 Handle error states in player
    - Display elegant error message for stream failures
    - Add "Tentar Novamente" button
    - Show loading spinner during stream initialization
    - _Requirements: 6.5_

- [ ] 7. Create expandable SearchBar component
  - [ ] 7.1 Build search bar structure
    - Create frontend/src/components/search/SearchBar.tsx
    - Implement collapsed state (icon only, 40px width)
    - Implement expanded state (input field, 300px width)
    - Add smooth width transition (300ms)
    - _Requirements: 8.1_
  
  - [ ] 7.2 Implement search functionality
    - Add input field with onChange handler
    - Implement debouncing (500ms delay)
    - Call search API with debounced query
    - _Requirements: 8.2_
  
  - [ ] 7.3 Create search results dropdown
    - Add dropdown container below search input
    - Display channel results with logo, name, and category
    - Highlight search term in results
    - Add click handler to select result
    - _Requirements: 8.2, 8.3, 8.4_
  
  - [ ] 7.4 Handle empty and error states
    - Display "Nenhum resultado encontrado" message
    - Show loading spinner during search
    - Add suggestions for empty results
    - _Requirements: 8.5_

- [ ] 8. Build home page with all sections
  - [ ] 8.1 Create new home page structure
    - Update frontend/src/app/dashboard/page.tsx
    - Remove old grid layout
    - Add NetflixLayout wrapper
    - _Requirements: 1.1, 2.1_
  
  - [ ] 8.2 Implement data fetching logic
    - Fetch featured channel for hero banner
    - Fetch all categories
    - Fetch channels per category (paginated, 20 per page)
    - Fetch user favorites
    - _Requirements: 1.1, 2.1, 9.1_
  
  - [ ] 8.3 Render HeroBanner with featured channel
    - Select random or most viewed channel as featured
    - Pass channel data to HeroBanner component
    - Handle play and more info actions
    - _Requirements: 1.1, 1.3, 1.4_
  
  - [ ] 8.4 Render Favorites carousel
    - Check if user has favorites
    - Render CategoryCarousel with favorites data
    - Position as first carousel after hero
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 8.5 Render category carousels
    - Map through categories and render CategoryCarousel for each
    - Pass category and channels data
    - Implement lazy loading for each carousel
    - _Requirements: 2.1, 2.4_
  
  - [ ] 8.6 Implement player modal state
    - Add state for selected channel and modal visibility
    - Handle play action from cards and hero banner
    - Handle close modal action
    - _Requirements: 6.1, 6.6_

- [ ] 9. Add animations and transitions
  - [ ] 9.1 Implement card stagger animations
    - Add CSS keyframes for fadeIn and scaleIn
    - Apply animation delays to cards (0.05s increments)
    - Use animation-fill-mode: both
    - _Requirements: 7.1, 7.2_
  
  - [ ] 9.2 Add carousel scroll animations
    - Implement smooth scroll behavior
    - Add easing function for natural feel
    - _Requirements: 7.3_
  
  - [ ] 9.3 Implement modal animations
    - Add scale and fade animations for modal open/close
    - Implement backdrop fade transition
    - _Requirements: 7.4_
  
  - [ ] 9.4 Add header scroll transition
    - Implement smooth background color transition
    - Add backdrop-filter blur effect
    - _Requirements: 5.1, 5.2, 7.1_

- [ ] 10. Implement responsive design
  - [ ] 10.1 Add mobile breakpoints
    - Configure card sizes for mobile (2 cards visible)
    - Adjust hero banner height for mobile (60vh)
    - Update header layout for mobile
    - _Requirements: 10.1, 10.3_
  
  - [ ] 10.2 Implement mobile navigation
    - Create hamburger menu button
    - Build slide-out drawer for navigation
    - Add touch-friendly spacing
    - _Requirements: 10.4_
  
  - [ ] 10.3 Add touch scroll support
    - Enable touch scrolling on carousels
    - Remove navigation buttons on mobile
    - Add scroll snap for better UX
    - _Requirements: 10.2_
  
  - [ ] 10.4 Optimize player for mobile
    - Make player fullscreen on mobile automatically
    - Adjust controls size for touch
    - _Requirements: 10.5_

- [ ] 11. Performance optimizations
  - [ ] 11.1 Implement image lazy loading
    - Add loading="lazy" to all channel images
    - Implement progressive image loading with skeleton
    - Add image error handling with fallback
    - _Requirements: 3.6_
  
  - [ ] 11.2 Add intersection observer for carousels
    - Lazy load carousel content when visible
    - Unload off-screen carousels
    - _Requirements: 2.4_
  
  - [ ] 11.3 Implement search debouncing
    - Add useDebounce hook
    - Apply 500ms delay to search queries
    - Cancel pending requests on new input
    - _Requirements: 8.2_
  
  - [ ] 11.4 Add scroll throttling
    - Throttle header scroll listener (100ms)
    - Throttle carousel scroll position updates
    - _Requirements: 5.2_

- [ ] 12. Update API service for new features
  - [ ] 12.1 Add getFeaturedChannel endpoint
    - Create function to fetch random or featured channel
    - Add logic to select channel with logo_url
    - _Requirements: 1.1_
  
  - [ ] 12.2 Add getChannelsByCategory endpoint
    - Create function to fetch channels filtered by category
    - Add pagination support (page, limit)
    - Return hasMore flag
    - _Requirements: 2.1, 2.4_
  
  - [ ] 12.3 Add searchChannels endpoint
    - Create function to search channels by name
    - Implement fuzzy search or ILIKE query
    - Return relevant results ordered by relevance
    - _Requirements: 8.2_
  
  - [ ] 12.4 Add getRelatedChannels endpoint
    - Create function to fetch channels from same category
    - Exclude current channel from results
    - Limit to 10 results
    - _Requirements: 6.2_

- [ ] 13. Final polish and testing
  - [ ] 13.1 Test all interactive elements
    - Verify card hover effects work smoothly
    - Test carousel navigation in all scenarios
    - Verify modal open/close animations
    - Test search functionality end-to-end
    - _Requirements: 3.2, 2.2, 7.4, 8.2_
  
  - [ ] 13.2 Test responsive behavior
    - Verify layout on mobile (375px width)
    - Test on tablet (768px width)
    - Test on desktop (1920px width)
    - Verify touch interactions on mobile
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 13.3 Verify accessibility
    - Test keyboard navigation (Tab, Enter, Escape, Arrows)
    - Verify ARIA labels are present
    - Test with screen reader
    - Check color contrast ratios
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 13.4 Performance audit
    - Run Lighthouse audit
    - Verify images are optimized
    - Check for layout shifts
    - Measure time to interactive
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [ ] 13.5 Cross-browser testing
    - Test on Chrome, Firefox, Safari, Edge
    - Verify HLS playback works on all browsers
    - Check CSS compatibility
    - Test animations performance
    - _Requirements: 6.2, 7.1, 7.2, 7.3, 7.4_
