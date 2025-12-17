import { projectId, publicAnonKey } from './supabase/info';

export interface AIInfraFeature {
  type: 'Feature';
  properties: {
    name: string;
    location: string;
    companies: string;
    launch_date: string;
    power: string;
    hardware: string;
    details: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface AIInfraCollection {
  type: 'FeatureCollection';
  features: AIInfraFeature[];
}

const AI_INFRA_DATA: AIInfraCollection = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "xAI 'Colossus'",
        "location": "Memphis, Tennessee, USA",
        "companies": "xAI (owner); Power by MLGW/TVA",
        "launch_date": "Jul 2024 (partial)",
        "power": "150 MW requested",
        "hardware": "100k NVIDIA H100 GPUs (planned, expanding to 300k next-gen)",
        "details": "Built in 750k ft² repurposed facility; initially 8 MW grid + 35 MW generators; aiming for world's most powerful LLM training site by 2025."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-90.1, 35.08]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Microsoft Azure OpenAI Supercomputer",
        "location": "West Des Moines, Iowa, USA",
        "companies": "Microsoft (Azure); OpenAI",
        "launch_date": "2020 (expanded through 2023)",
        "power": "Unknown",
        "hardware": "10,000 NVIDIA V100 GPUs, 285k CPU cores",
        "details": "Custom-built Azure AI cluster to train GPT-4; among world's most powerful, powered 100% by renewable energy in Iowa."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-93.71, 41.58]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Microsoft 'Fairwater' AI Center",
        "location": "Mount Pleasant, Wisconsin, USA",
        "companies": "Microsoft (Azure)",
        "launch_date": "Planned ~2026",
        "power": "250 MW",
        "hardware": "Hundreds of thousands of NVIDIA GPUs (H100)",
        "details": "315-acre Foxconn site; closed-loop liquid cooling; supports 10× current top supercomputer capacity."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-87.95, 42.70]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Google Cloud TPU v4 Pod Cluster",
        "location": "Pryor, Oklahoma, USA",
        "companies": "Google (Cloud AI)",
        "launch_date": "May 2022",
        "power": "Unknown",
        "hardware": "8× TPU v4 Pods (~9 exaflops FP16)",
        "details": "Public ML hub (8 pods, 4,096 TPU chips each); ~90% carbon-free energy."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-95.32, 36.30]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "OpenAI Stargate – Abilene Hub",
        "location": "Abilene, Texas, USA",
        "companies": "OpenAI; Oracle (OCI cloud)",
        "launch_date": "2025",
        "power": ">600 MW (planned)",
        "hardware": "NVIDIA HGX (H100/H200) systems",
        "details": "Flagship OpenAI campus on Oracle Cloud; receiving NVIDIA Blackwell GPUs in 2025; 600 MW expansion planned."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-99.73, 32.45]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "OpenAI Stargate – Shackelford Site",
        "location": "Shackelford County, Texas, USA",
        "companies": "OpenAI; Oracle (OCI)",
        "launch_date": "Planned 2025–26",
        "power": "~1–2 GW (planned)",
        "hardware": "NVIDIA GPU superclusters",
        "details": "New Oracle AI site (part of ~4.5 GW expansion) to support OpenAI."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-99.40, 32.80]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "OpenAI Stargate – Doña Ana Site",
        "location": "Doña Ana County, New Mexico, USA",
        "companies": "OpenAI; Oracle (OCI)",
        "launch_date": "Planned 2025–26",
        "power": "~1–2 GW (planned)",
        "hardware": "NVIDIA GPU superclusters",
        "details": "New Oracle AI data center in NM desert for OpenAI expansion."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-106.88, 32.40]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "OpenAI/SoftBank – Lordstown Site",
        "location": "Lordstown, Ohio, USA",
        "companies": "OpenAI; SoftBank/SB Energy",
        "launch_date": "2025 (groundbreaking)",
        "power": "Up to 1.5 GW",
        "hardware": "Multiple GPU clusters",
        "details": "SoftBank advanced data center campus; 1.5 GW, operational ~2026."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-80.85, 41.17]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "OpenAI/SoftBank – Milam Site",
        "location": "Milam County, Texas, USA",
        "companies": "OpenAI; SoftBank (SB Energy)",
        "launch_date": "Planned 2025",
        "power": "Up to 1.5 GW",
        "hardware": "Multiple GPU clusters",
        "details": "Fast-build AI data center with SB Energy; up to 1.5 GW within ~18 months."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-96.95, 30.78]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "CoreWeave Lancaster AI Campus",
        "location": "Lancaster, Pennsylvania, USA",
        "companies": "CoreWeave",
        "launch_date": "Planned 2025–26",
        "power": "100 MW initial (300 MW max)",
        "hardware": "NVIDIA HGX H100/H200 clusters",
        "details": "$6B new AI data center; Mid-Atlantic hub (300 MW) for GPU cloud."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-76.25, 40.00]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "CoreWeave Plano Facility",
        "location": "Plano, Texas, USA",
        "companies": "CoreWeave; Lincoln Rackhouse",
        "launch_date": "Late 2023",
        "power": "30 MW (12 MW initial)",
        "hardware": "Tens of thousands of NVIDIA A100/H100 GPUs",
        "details": "454k ft² GPU data center on 23.8-acre campus; 4 halls, InfiniBand fabric."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-96.76, 33.05]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "CoreWeave CTP (Chester) Site",
        "location": "Chesterfield, Virginia, USA",
        "companies": "CoreWeave; Chirisa",
        "launch_date": "2023",
        "power": "28 MW",
        "hardware": "NVIDIA A100/H100 clusters",
        "details": "250k ft² turnkey GPU data center; part of 88-acre campus (scalable to 100 MW)."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-77.36, 37.34]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "CoreWeave Hillsboro Cluster",
        "location": "Hillsboro, Oregon, USA",
        "companies": "CoreWeave; Flexential/Digital Realty",
        "launch_date": "2023",
        "power": "9 MW + 36 MW expansion",
        "hardware": "NVIDIA H100 GPUs (InfiniBand fabric)",
        "details": "Deployed in Flexential DC; plus 36 MW expansion for single 10k+ GPU cluster."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-122.96, 45.53]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "CoreWeave at Switch LAS1",
        "location": "Las Vegas, Nevada, USA",
        "companies": "CoreWeave; Switch Inc.",
        "launch_date": "2022",
        "power": "Unknown",
        "hardware": "NVIDIA A100 GPUs",
        "details": "GPU cloud region in Switch Tier 5 Las Vegas campus; powered by 100% renewable energy."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-115.17, 36.10]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "CoreWeave–Bulk Norway Cluster",
        "location": "Vennesla, Agder, Norway",
        "companies": "CoreWeave; Bulk Infrastructure",
        "launch_date": "Summer 2025",
        "power": "42 MW (1 GW campus)",
        "hardware": "NVIDIA GB200 (Grace+Blackwell) nodes",
        "details": "One of Europe's largest AI clusters; at Bulk N01 hydropower campus (100% renewable)."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [7.96, 58.27]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "NVIDIA Eos Supercomputer",
        "location": "Santa Clara, California, USA",
        "companies": "NVIDIA (internal)",
        "launch_date": "Nov 2023",
        "power": "Unknown (~20–30 MW)",
        "hardware": "4,608 NVIDIA H100 GPUs (DGX SuperPOD)",
        "details": "NVIDIA's AI factory (18.4 EF FP8); 576 DGX H100 nodes with Quantum-2 InfiniBand."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-121.97, 37.39]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "ORNL Frontier (OLCF-5)",
        "location": "Oak Ridge, Tennessee, USA",
        "companies": "DOE Oak Ridge; HPE; AMD",
        "launch_date": "May 2022",
        "power": "~40 MW",
        "hardware": "37,632 AMD MI250X GPUs + 9,408 AMD CPUs",
        "details": "1.1 EF Linpack (1st exascale); 74 Cray EX cabinets, warm-water cooling; Top500 #1 (2022)."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-84.31, 35.93]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "ANL Aurora (ALCF)",
        "location": "Lemont, Illinois, USA",
        "companies": "DOE Argonne; HPE; Intel",
        "launch_date": "2024",
        "power": "~60 MW",
        "hardware": "63,744 Intel GPU Max + 21,248 Xeon Max CPUs",
        "details": "2+ EF peak supercomputer (10,624 nodes, Slingshot-11 network); for science + AI."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-87.98, 41.71]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "LLNL El Capitan (ATS-4)",
        "location": "Livermore, California, USA",
        "companies": "DOE LLNL; HPE; AMD",
        "launch_date": "2024–25",
        "power": "~60 MW (design)",
        "hardware": "AMD MI300A APU nodes (~2.7 EF)",
        "details": "NNSA exascale system (>2 EF); ~11k nodes with 3D-stacked CPU+GPU chips."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-121.71, 37.68]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "NERSC Perlmutter",
        "location": "Berkeley, California, USA",
        "companies": "DOE NERSC (LBNL); HPE; NVIDIA",
        "launch_date": "2021",
        "power": "~20 MW",
        "hardware": "7,168 NVIDIA A100 GPUs + 3,072 AMD CPUs",
        "details": "Cray Shasta system for science + AI; 1,792 GPU nodes (4× A100 each); Slingshot-11 network."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-122.24, 37.88]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "PSC Neocortex",
        "location": "Pittsburgh, Pennsylvania, USA",
        "companies": "NSF/PSC; HPE; Cerebras",
        "launch_date": "Dec 2020 (upgraded 2022)",
        "power": "<1 MW",
        "hardware": "2× Cerebras CS-2 WSE (850k cores each)",
        "details": "NSF AI testbed with 2 wafer-scale chips + HPE Superdome; for extreme deep learning research."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-79.94, 40.44]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "SDSC Voyager",
        "location": "La Jolla, California, USA",
        "companies": "NSF/SDSC; Intel Habana",
        "launch_date": "May 2022",
        "power": "<1 MW",
        "hardware": "336 Habana Gaudi + 16 Habana Goya chips",
        "details": "NSF experimental AI supercomputer (Intel Habana accelerators); 3-year open research testbed."
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-117.24, 32.88]
      }
    }
  ]
};

// Seed the AI infrastructure data (call once)
export async function seedAIInfraData(): Promise<void> {
  try {
    console.log('[aiInfraApi] Seeding AI infrastructure data...');
    console.log('[aiInfraApi] Number of features to seed:', AI_INFRA_DATA.features.length);
    console.log('[aiInfraApi] First feature:', AI_INFRA_DATA.features[0]);
    
    const url = `https://${projectId}.supabase.co/functions/v1/map_data/ai-infra/seed`;
    console.log('[aiInfraApi] Seed URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(AI_INFRA_DATA),
    });

    console.log('[aiInfraApi] Seed response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[aiInfraApi] Seed error response:', errorText);
      throw new Error(`Failed to seed AI infrastructure data: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[aiInfraApi] Seed result:', result);
    console.log('[aiInfraApi] Successfully seeded AI infrastructure data');
  } catch (error) {
    console.error('[aiInfraApi] Error seeding AI infrastructure data:', error);
    throw error;
  }
}

// Fetch AI infrastructure data
export async function fetchAIInfraData(): Promise<AIInfraCollection> {
  try {
    console.log('[aiInfraApi] Fetching AI infrastructure data from backend...');
    const url = `https://${projectId}.supabase.co/functions/v1/map_data/ai-infra`;
    console.log('[aiInfraApi] URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    console.log('[aiInfraApi] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[aiInfraApi] Error response:', errorText);
      throw new Error(`Failed to fetch AI infrastructure data: ${response.status}`);
    }

    const data = await response.json();
    console.log('[aiInfraApi] Received data:', data);
    console.log('[aiInfraApi] Features count:', data?.features?.length || 0);
    
    // If no data exists, seed it
    if (!data.features || data.features.length === 0) {
      console.log('[aiInfraApi] No AI infrastructure data found, seeding...');
      await seedAIInfraData();
      // Fetch again after seeding
      console.log('[aiInfraApi] Fetching again after seeding...');
      const secondResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const secondData = await secondResponse.json();
      console.log('[aiInfraApi] Second fetch data:', secondData);
      console.log('[aiInfraApi] Second fetch features count:', secondData?.features?.length || 0);
      return secondData;
    }

    return data;
  } catch (error) {
    console.error('[aiInfraApi] Error fetching AI infrastructure data:', error);
    return { type: 'FeatureCollection', features: [] };
  }
}