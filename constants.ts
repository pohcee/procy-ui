import type { TunnelOption, InstallerOption } from '~/types';

export const INSTALLER_OPTIONS: InstallerOption[] = [
	{
		id: 'remote',
		label: 'Enable remote script and command',
		flag: 'x',
		platformSupport: 'all',
	},
	{
		id: 'sudoright',
		label: 'Give remote scripts and command sudo rights',
		flag: 's',
		platformSupport: 'linux',
	},
	{
		id: 'filetransfer',
		label: 'Enable file transfer',
		flag: 'r',
		platformSupport: 'all',
	},
	{
		id: 'sudotransfer',
		label: 'Enable file transfer sudo rights',
		flag: 'b',
		platformSupport: 'linux',
	},
	{
		id: 'tacoscript',
		label: 'Install Tacoscript along with the RPort client',
		flag: 'i',
		platformSupport: 'all',
	},
] as const;

export const TUNNEL_OPTIONS: TunnelOption[] = [
	{
		id: 'ssh',
		label: 'SSH',
		ports: '22',
	},
	{
		id: 'rdp',
		label: 'Remote Desktop (RDP)',
		ports: '3389',
	},
	{
		id: 'vnc',
		label: 'VNC',
		ports: '5900',
	},
	{
		id: 'realvnc',
		label: 'RealVNC®',
		ports: '5900',
	},
	{
		id: 'http',
		label: 'HTTP',
		ports: '80',
	},
	{
		id: 'https',
		label: 'HTTPs',
		ports: '443',
	},
	{
		id: 'other',
		label: 'Any Service',
		ports: '80',
	},
	{
		id: 'forwarding',
		label: 'Service Forwarding',
		ports: '',
	},
] as const;
