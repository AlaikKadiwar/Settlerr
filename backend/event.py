import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import os
from bs4 import BeautifulSoup
import re
import json
from dateutil import parser as date_parser

class EventbriteClient:
    """Scrapes events from Eventbrite's public website"""
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
    
    def _extract_date_from_text(self, text: str) -> Dict[str, str]:
        """Extract date and time from text using regex patterns"""
        result = {'start_time': '', 'end_time': '', 'date_display': ''}
        
        if not text:
            return result
        
        date_patterns = [
            r'(?:on\s+)?([A-Za-z]+,?\s+[A-Za-z]+\s+\d{1,2},\s+\d{4})\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)',
            r'(?:on\s+)?([A-Za-z]+\s+\d{1,2},\s+\d{4})\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)',
            r'(?:on\s+)?([A-Za-z]+\s+\d{1,2},\s+\d{4})',
            r'(\d{1,2}/\d{1,2}/\d{4})',
            r'(\d{4}-\d{2}-\d{2})',
            r'([A-Za-z]{3},\s+[A-Za-z]{3}\s+\d{1,2})',
        ]
        
        found_date = None
        found_time = None
        has_time_in_pattern = False
        
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                found_date = match.group(1).strip()
                if match.lastindex >= 2:
                    found_time = match.group(2).strip()
                    has_time_in_pattern = True
                    result['date_display'] = f"{found_date} at {found_time}"
                else:
                    result['date_display'] = found_date
                break
        
        if not has_time_in_pattern:
            time_patterns = [r'(\d{1,2}:\d{2}\s*[AP]M)', r'(\d{1,2}\s*[AP]M)']
            
            for pattern in time_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    found_time = match.group(1).strip()
                    if result['date_display'] and 'at' not in result['date_display']:
                        result['date_display'] = f"{result['date_display']} at {found_time}"
                    elif not result['date_display']:
                        result['date_display'] = found_time
                    break
        
        if found_date:
            try:
                if found_time:
                    full_datetime = f"{found_date} {found_time}"
                    dt = date_parser.parse(full_datetime, fuzzy=True)
                else:
                    dt = date_parser.parse(found_date, fuzzy=True)
                result['start_time'] = dt.isoformat()
            except:
                try:
                    date_only = found_date.split(' at ')[0].strip()
                    for fmt in ['%B %d, %Y', '%b %d, %Y', '%m/%d/%Y', '%Y-%m-%d']:
                        try:
                            dt = datetime.strptime(date_only, fmt)
                            result['start_time'] = dt.isoformat()
                            break
                        except:
                            continue
                except:
                    pass
        
        return result
    
    def get_events_next_month(
        self, 
        location: str = "Calgary",
        radius: str = "10km",
        max_results: int = 100
    ) -> List[Dict]:
        """
        Scrape events from Eventbrite website for the next month.
        
        Args:
            location: City to search (e.g., "Calgary", "Toronto")
            radius: Search radius (ignored for scraping)
            max_results: Maximum number of events to return
            
        Returns:
            List of event dictionaries with relevant details
        """
        location_slug = location.lower().replace(" ", "-").replace(",", "")
        base_url = f"https://www.eventbrite.com/d/canada--{location_slug}/all-events/"
        
        all_events = []
        page = 1
        
        while len(all_events) < max_results and page <= 3:
            try:
                url = f"{base_url}?page={page}" if page > 1 else base_url
                
                response = requests.get(url, headers=self.headers, timeout=15)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                script_tags = soup.find_all('script', type='application/ld+json')
                
                events_found = 0
                for script in script_tags:
                    try:
                        data = json.loads(script.string)
                        if isinstance(data, list):
                            for item in data:
                                if item.get('@type') == 'Event':
                                    event = self._parse_json_ld_event(item)
                                    if event:
                                        all_events.append(event)
                                        events_found += 1
                        elif data.get('@type') == 'Event':
                            event = self._parse_json_ld_event(data)
                            if event:
                                all_events.append(event)
                                events_found += 1
                    except json.JSONDecodeError:
                        continue
                
                if events_found == 0:
                    html_events = self._parse_html_events(soup)
                    all_events.extend(html_events)
                    events_found = len(html_events)
                
                if events_found == 0:
                    break
                
                page += 1
                
            except:
                break
        
        filtered_events = self._filter_by_date_range(all_events)
        return filtered_events[:max_results]
    
    def _parse_json_ld_event(self, data: Dict) -> Optional[Dict]:
        """Parse event from JSON-LD structured data"""
        try:
            location = data.get('location', {})
            address = location.get('address', {})
            
            return {
                "id": data.get('url', '').split('/')[-1] if data.get('url') else None,
                "name": data.get('name', ''),
                "description": data.get('description', ''),
                "url": data.get('url', ''),
                "start_time": data.get('startDate', ''),
                "end_time": data.get('endDate', ''),
                "is_free": data.get('isAccessibleForFree', False) or 'free' in str(data.get('offers', {})).lower(),
                "logo_url": data.get('image', ''),
                "venue": {
                    "name": location.get('name', ''),
                    "address": address.get('streetAddress', '') if address else '',
                    "latitude": None,
                    "longitude": None
                } if location else None,
                "organizer": {
                    "name": data.get('organizer', {}).get('name', ''),
                    "description": data.get('organizer', {}).get('description', '')
                } if data.get('organizer') else None,
                "category": None,
                "capacity": None
            }
        except:
            return None
    
    def _parse_html_events(self, soup: BeautifulSoup) -> List[Dict]:
        """Parse events from HTML when JSON-LD is not available"""
        events = []
        
        selectors = [
            'article[data-event-id]',
            'div[data-event-id]',
            'div.discover-search-desktop-card',
            'div.search-event-card',
            'a.event-card-link'
        ]
        
        for selector in selectors:
            cards = soup.select(selector)
            if cards:
                for card in cards:
                    event = self._parse_html_card(card)
                    if event:
                        events.append(event)
                break
        
        return events
    
    def _parse_html_card(self, card) -> Optional[Dict]:
        """Parse individual event card from HTML"""
        try:
            # Extract title
            title_elem = card.find(['h2', 'h3', 'h4']) or card.find('a')
            title = title_elem.get_text(strip=True) if title_elem else "Untitled Event"
            
            # Extract URL
            link_elem = card.find('a', href=True)
            url = link_elem['href'] if link_elem else ""
            if url and not url.startswith('http'):
                url = f"https://www.eventbrite.com{url}"
            
            start_time = ""
            end_time = ""
            date_str = ""
            
            time_elems = card.find_all('time')
            for time_elem in time_elems:
                if time_elem.get('datetime'):
                    if not start_time:
                        start_time = time_elem.get('datetime')
                        date_str = time_elem.get_text(strip=True)
                    else:
                        end_time = time_elem.get('datetime')
            
            if not date_str:
                date_elem = card.find(['span', 'div', 'p'], class_=re.compile('date|time', re.I))
                if date_elem:
                    date_str = date_elem.get_text(strip=True)
            
            description = ""
            desc_elem = card.find(['p', 'div'], class_=re.compile('summary|description|text', re.I))
            if desc_elem:
                description = desc_elem.get_text(strip=True)
            
            venue_name = ""
            venue_elem = card.find(['span', 'div', 'p'], class_=re.compile('location|venue|address', re.I))
            if venue_elem:
                venue_name = venue_elem.get_text(strip=True)
            
            img_elem = card.find('img')
            image_url = img_elem.get('src', '') if img_elem else ""
            
            if url and (not description or not start_time):
                event_details = self._fetch_event_details(url)
                if event_details:
                    if not description:
                        description = event_details.get('description', '')
                    if not start_time:
                        start_time = event_details.get('start_time', '')
                    if not end_time:
                        end_time = event_details.get('end_time', '')
                    if not date_str and event_details.get('date_display'):
                        date_str = event_details.get('date_display', '')
            
            if description and (not start_time or not date_str):
                date_info = self._extract_date_from_text(description)
                if not start_time and date_info.get('start_time'):
                    start_time = date_info['start_time']
                if not date_str and date_info.get('date_display'):
                    date_str = date_info['date_display']
                if not end_time and date_info.get('end_time'):
                    end_time = date_info['end_time']
            
            if not start_time or not date_str:
                card_text = card.get_text()
                date_info = self._extract_date_from_text(card_text)
                if not start_time and date_info.get('start_time'):
                    start_time = date_info['start_time']
                if not date_str and date_info.get('date_display'):
                    date_str = date_info['date_display']
            
            return {
                "id": url.split('/')[-1].split('?')[0] if url else None,
                "name": title,
                "description": description,
                "url": url,
                "start_time": start_time or date_str,
                "end_time": end_time,
                "date_display": date_str,
                "is_free": 'free' in card.get_text().lower(),
                "logo_url": image_url,
                "venue": {
                    "name": venue_name,
                    "address": venue_name,
                    "latitude": None,
                    "longitude": None
                } if venue_name else None,
                "organizer": None,
                "category": None,
                "capacity": None
            }
        except:
            return None
    
    def _fetch_event_details(self, event_url: str) -> Dict:
        """Fetch full event details including description and date/time from event page"""
        try:
            response = requests.get(event_url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            details = {}
            
            # Extract description
            desc_selectors = [
                'div.eds-text--left',
                'div[class*="description"]',
                'div[class*="summary"]',
                'meta[name="description"]',
                'meta[property="og:description"]'
            ]
            
            for selector in desc_selectors:
                if 'meta' in selector:
                    elem = soup.find('meta', attrs={'name': 'description'}) or \
                           soup.find('meta', attrs={'property': 'og:description'})
                    if elem and elem.get('content'):
                        details['description'] = elem.get('content', '')
                        break
                else:
                    elem = soup.select_one(selector)
                    if elem:
                        text = elem.get_text(strip=True)
                        if len(text) > 50:
                            details['description'] = text
                            break
            
            script_tags = soup.find_all('script', type='application/ld+json')
            for script in script_tags:
                try:
                    data = json.loads(script.string)
                    if isinstance(data, dict) and data.get('@type') == 'Event':
                        details['start_time'] = data.get('startDate', '')
                        details['end_time'] = data.get('endDate', '')
                        
                        if details.get('start_time'):
                            try:
                                dt = datetime.fromisoformat(details['start_time'].replace('Z', '+00:00'))
                                hour = dt.strftime('%I').lstrip('0')
                                formatted_time = f"{hour}:{dt.strftime('%M %p')}"
                                details['date_display'] = f"{dt.strftime('%a, %b %d, %Y')} at {formatted_time}"
                            except:
                                pass
                        break
                except:
                    continue
            
            if not details.get('start_time'):
                time_elem = soup.find('time', {'datetime': True})
                if time_elem:
                    details['start_time'] = time_elem.get('datetime', '')
                    details['date_display'] = time_elem.get_text(strip=True)
            
            return details
        except:
            return {}
    
    def _filter_by_date_range(self, events: List[Dict]) -> List[Dict]:
        """Filter events to next 30 days"""
        filtered = []
        now = datetime.utcnow()
        end_date = now + timedelta(days=30)
        
        for event in events:
            try:
                start_str = event.get('start_time', '')
                if start_str:
                    if 'T' in start_str:
                        event_date = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
                    else:
                        filtered.append(event)
                        continue
                    
                    if now <= event_date <= end_date:
                        filtered.append(event)
                else:
                    filtered.append(event)
            except Exception:
                filtered.append(event)
        
        return filtered if filtered else events
    
    def _format_event(self, event: Dict) -> Dict:
        return event


