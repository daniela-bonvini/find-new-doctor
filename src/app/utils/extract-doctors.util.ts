import { Doctor } from '../models/doctor.model';

export function extractDoctorsData(htmlContent: string): Doctor[] {
  const doctors: Doctor[] = [];

  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Find all table rows that contain doctor data
  const rows = doc.querySelectorAll('table tr');

  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');

    // Skip header rows and empty rows
    if (cells.length < 8) {
      if (index < 5) {
        // Only log first few rows to avoid spam
      }
      return;
    }

    // Skip separator rows (rows with only border styling)
    const firstCell = cells[0];
    if (firstCell.getAttribute('colspan') === '9') {
      return;
    }

    // Extract availability status from the flag image
    const flagImg = cells[0].querySelector('img');
    let availability: 'available' | 'full' | 'limited' = 'available';

    if (flagImg) {
      const src = flagImg.getAttribute('src') || '';
      if (src.includes('redflag')) {
        availability = 'full';
      } else if (src.includes('arancio')) {
        availability = 'limited';
      } else if (src.includes('greenflag')) {
        availability = 'available';
      }
    }

    // Extract doctor name
    const nameCell = cells[1];
    const doctorName = nameCell.textContent?.trim().replace(/\s+/g, ' ') || '';

    if (!doctorName) return; // Skip empty rows

    // Extract type (MMG or PLS)
    const typeCell = cells[2];
    const type = typeCell.textContent?.trim() as 'MMG' | 'PLS';

    if (!type || (type !== 'MMG' && type !== 'PLS')) return;

    // Extract address and schedule
    const addressCell = cells[3];
    const addressText =
      addressCell.querySelector('span:first-child')?.textContent?.trim() || '';

    // Extract schedule from title attribute of clock icon
    const clockIcon = addressCell.querySelector('img[src*="orologio"]');
    const schedule = clockIcon?.getAttribute('title')?.trim() || '';

    // Extract contacts
    const contactsCell = cells[4];
    const contactsText = contactsCell.textContent || '';
    const emailLink = contactsCell.querySelector('a[href^="mailto:"]');

    const phoneMatch = contactsText.match(/[\d\-\s\/\+\(\)]+/);
    const phone = phoneMatch ? phoneMatch[0].trim() : undefined;
    const email =
      emailLink?.getAttribute('href')?.replace('mailto:', '') || undefined;

    // Extract city
    const cityCell = cells[5];
    const cityLink = cityCell.querySelector('a');
    const city =
      cityLink?.textContent?.trim() || cityCell.textContent?.trim() || '';

    // Extract area
    const areaCell = cells[6];
    const area = areaCell.textContent?.trim() || '';

    // Extract association, group, network codes
    const associationCell = cells[7];
    const associationLinks = associationCell.querySelectorAll('a');

    let association: string | undefined;
    let group: string | undefined;
    let network: string | undefined;

    associationLinks.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent?.trim() || '';

      if (href.includes('ass=') && text) {
        association = text;
      } else if (href.includes('grp=') && text) {
        group = text;
      } else if (href.includes('rete=') && text) {
        network = text;
      }
    });

    const doctor: Doctor = {
      name: doctorName,
      type,
      address: addressText,
      contacts: {
        phone,
        email,
      },
      city,
      area,
      schedule: schedule || undefined,
      availability,
      association,
      group,
      network,
    };

    doctors.push(doctor);
  });

  return doctors;
}

// Utility function to load and extract data from the asset file
export async function loadDoctorsFromFile(): Promise<Doctor[]> {
  try {
    const response = await fetch('/assets/asur_marche.txt');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const htmlContent = await response.text();

    if (htmlContent.length === 0) {
      throw new Error('File is empty');
    }

    const doctors = extractDoctorsData(htmlContent);
    return doctors;
  } catch (error) {
    console.error('Error loading doctors data:', error);
    return [];
  }
}

// Function to filter doctors by various criteria
export function filterDoctors(
  doctors: Doctor[],
  filters: {
    type?: 'MMG' | 'PLS';
    city?: string;
    area?: string;
    availability?: 'available' | 'full' | 'limited';
    name?: string;
  }
): Doctor[] {
  return doctors.filter((doctor) => {
    if (filters.type && doctor.type !== filters.type) return false;
    if (
      filters.city &&
      !doctor.city.toLowerCase().includes(filters.city.toLowerCase())
    )
      return false;
    if (filters.area && doctor.area !== filters.area) return false;
    if (filters.availability && doctor.availability !== filters.availability)
      return false;
    if (
      filters.name &&
      !doctor.name.toLowerCase().includes(filters.name.toLowerCase())
    )
      return false;

    return true;
  });
}
