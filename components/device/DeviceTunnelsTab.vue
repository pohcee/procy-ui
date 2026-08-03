<template>
	<div class="h-full flex-1">
		<div class="mt-8 w-full shrink-0">
			<div class="relative z-10 w-full">
				<div class="sm:flex sm:items-center">
					<div class="sm:flex-auto">
						<h1 class="text-base font-semibold leading-6 text-gray-800 dark:text-gray-50">
							Tunnels
						</h1>
						<p class="mt-2 text-sm text-gray-700 dark:text-gray-500" />
					</div>
					<div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
						<button
							class="bg-primary-800 hover:bg-primary-800 focus-visible:outline-primary-600 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:focus-visible:outline-gray-400 text-white disabled:text-gray-500 cursor-pointer rounded-md px-2.5 py-1.5 text-sm relative font-semibold shadow-sm transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
							type="button"
							@click="$emit('addtunnel')"
						>
							<span class="flex items-center justify-center gap-x-2"> Add Tunnel</span>
						</button>
					</div>
				</div>
				<div class="mt-8 flow-root overflow-hidden border border-gray-100 ring-1 ring-black ring-opacity-10 dark:border-gray-600 sm:rounded-lg">
					<div class="overflow-auto relative z-10 -mb-2">
						<div class="inline-block min-w-full align-middle">
							<div class="sm:rounded-lg overflow-hidden">
								<div>
									<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
										<thead class="rounded-lg bg-gray-50 dark:bg-gray-950">
											<tr>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Allowed clients</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Exposed port</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>HTTP proxy</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Destination</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Port</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Protocol</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Name</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Created at</span>
													</button>
												</th>
												<th
													class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-800 sm:pl-6"
												/>
												<th
													class="relative w-6 whitespace-nowrap py-3.5 pl-3 pr-2 text-right text-sm font-medium sm:pr-2"
												/>
											</tr>
										</thead>
										<tbody class="z-10 divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
											<tr
												v-if="tunnels?.tunnels?.length <= 0"
												class="h-[210px] bg-white/10 backdrop-blur-sm dark:bg-black/10"
											>
												<td
													colspan="10"
													class="w-full flex-1 text-center text-gray-800 dark:text-gray-200"
												>
													No results
												</td>
											</tr>
											<tr
												v-for="tunnel in tunnels?.tunnels"
												:key="tunnel.id"
												class="cursor-pointer hover:bg-vtd-primary-600/30 border-t-1 group relative border-gray-200 transition-all duration-300"
											>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													{{ tunnel.acl }}
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													<div class="inline-flex w-max cursor-pointer">
														<span>{{ tunnel.lport }}</span>
													</div>
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													{{ tunnel.http_proxy ? 'Enabled': 'Disabled' }}
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													{{ tunnel.rhost }}
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													{{ tunnel.rport }}
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													<span class="text-center">{{ tunnel.protocol }}<span>:{{ tunnel.scheme }}</span></span>
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													-
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													<div class="inline-flex w-max cursor-pointer">
														{{ useTimeAgo(new Date(tunnel.created_at)).value }}
													</div>
												</td>
												<td class="pr-1 sm:pr-1 relative w-8 whitespace-nowrap py-3.5 pl-3 text-right text-sm font-normal">
													<DropdownMenu>
														<DropdownMenuTrigger as-child>
															<button type="button">
																<div class="z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-opacity-20 p-1 text-gray-600 transition-all duration-300 hover:bg-vtd-primary-500 hover:bg-opacity-30 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 dark:text-gray-300">
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		width="20px"
																		height="20px"
																		viewBox="0 0 24 24"
																		class="icon"
																	>
																		<path
																			fill="currentColor"
																			d="M16 12a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2m-6 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2m-6 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2Z"
																		/>
																	</svg>
																</div>
															</button>
														</DropdownMenuTrigger>
														<DropdownMenuContent class="w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-950">
															<div
																v-if="tunnel.tunnel_url"
																class="px-1 py-1"
															>
																<DropdownMenuItem
																	class="focus:bg-vtd-primary-600 focus:text-white group flex w-full items-center rounded-md px-2 py-2 text-xs transition-all duration-300"
																	@click="copy(tunnel.tunnel_url)"
																>
																	<span>Copy URL</span>
																</DropdownMenuItem>
															</div>
															<div class="px-1 py-1">
																<DropdownMenuItem
																	class="focus:bg-vtd-primary-600 focus:text-white group flex w-full items-center rounded-md px-2 py-2 text-xs transition-all duration-300"
																	@click="triggerDeleteTunnel(tunnel)"
																>
																	<span>Delete</span>
																</DropdownMenuItem>
															</div>
														</DropdownMenuContent>
													</DropdownMenu>
												</td>
												<td class="pl-1 relative w-8 whitespace-nowrap py-3.5 pl-3 text-right text-sm font-normal">
													<span class="absolute inset-y-0 right-0 flex w-6 items-center justify-center pr-2">
														<svg
															xmlns="http://www.w3.org/2000/svg"
															viewBox="0 0 20 20"
															fill="currentColor"
															aria-hidden="true"
															class="h-6 w-6 text-gray-300 transition-all duration-300 group-hover:text-gray-700 dark:text-gray-700 group-hover:dark:text-gray-200"
														>
															<path
																fill-rule="evenodd"
																d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
																clip-rule="evenodd"
															/>
														</svg>
													</span>
												</td>
												<!--												<div class="inline-flex w-max cursor-pointer"> -->
												<!--													<button class="absolute inset-y-0 left-0 right-16 z-10 w-[90%]" /> -->
												<!--													<button class="absolute inset-y-0 right-0 z-10 w-8" /> -->
												<!--													<button class="absolute inset-y-0 left-0 right-16 z-10 w-12" /> -->
												<!--													&lt;!&ndash;&ndash;&gt; -->
												<!--												</div> -->
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="h-12 w-full" />
			</div>
		</div>
		<div class="mt-32">
			<div class="relative z-10 w-full">
				<div class="sm:flex sm:items-center">
					<div class="sm:flex-auto">
						<h1 class="text-base font-semibold leading-6 text-gray-800 dark:text-gray-50">
							Stored tunnels and service forwarding
						</h1>
						<p class="mt-2 text-sm text-gray-700 dark:text-gray-500" />
					</div>
					<div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none" />
				</div>
				<div class="mt-8 flow-root overflow-hidden border border-gray-100 ring-1 ring-black ring-opacity-10 dark:border-gray-600 sm:rounded-lg">
					<div class="overflow-auto relative z-10 -mb-2">
						<div class="inline-block min-w-full align-middle">
							<div class="sm:rounded-lg overflow-hidden">
								<div>
									<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
										<thead class="rounded-lg bg-gray-50 dark:bg-gray-950">
											<tr>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Allowed clients</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Scheme</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Destination</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Port</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span>Name</span>
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span />
													</button>
												</th>
												<th
													class="text-left py-3.5 pl-4 pr-3 text-sm font-semibold text-gray-600 dark:text-gray-200 sm:pl-6"
													scope="col"
												>
													<button disabled="">
														<span />
													</button>
												</th>
												<th
													class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-800 sm:pl-6"
												/>
												<th
													class="relative w-6 whitespace-nowrap py-3.5 pl-3 pr-2 text-right text-sm font-medium sm:pr-2"
												/>
											</tr>
										</thead>
										<tbody class="z-10 divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
											<tr
												v-if="storedTuns?.length <= 0"
												class="h-[210px] bg-white/10 backdrop-blur-sm dark:bg-black/10"
											>
												<td
													colspan="9"
													class="w-full flex-1 text-center text-gray-800 dark:text-gray-200"
												>
													No results
												</td>
											</tr>
											<tr
												v-for="tun in storedTuns"
												:key="tun.id"
												class="cursor-pointer hover:bg-vtd-primary-600/30 border-t-1 group relative border-gray-200 transition-all duration-300"
											>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													{{ tun.acl }}
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													<span>{{ tun.scheme }}</span>
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													{{ tun.remote_ip }}
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													{{ tun.remote_port }}
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													{{ tun.name }}
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6">
													{{ String(tun.further_options.is_service_forwarding) }}
												</td>
												<td class="text-left min-h-[42px] whitespace-nowrap py-3.5 pl-4 pr-3 text-sm font-normal text-gray-800 dark:text-white sm:pl-6" />
												<td class="pr-1 sm:pr-1 relative w-8 whitespace-nowrap py-3.5 pl-3 text-right text-sm font-normal">
													<DropdownMenu>
														<DropdownMenuTrigger as-child>
															<button type="button">
																<div class="z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-opacity-20 p-1 text-gray-600 transition-all duration-300 hover:bg-vtd-primary-500 hover:bg-opacity-30 hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 dark:text-gray-300">
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		width="20px"
																		height="20px"
																		viewBox="0 0 24 24"
																		class="icon"
																	>
																		<path
																			fill="currentColor"
																			d="M16 12a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2m-6 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2m-6 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2Z"
																		/>
																	</svg>
																</div>
															</button>
														</DropdownMenuTrigger>
														<DropdownMenuContent class="w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-950">
															<div class="px-1 py-1">
																<DropdownMenuItem
																	class="focus:bg-vtd-primary-600 focus:text-white group flex w-full items-center rounded-md px-2 py-2 text-xs transition-all duration-300"
																	@click="triggerDeleteStoredTunnel(tun)"
																>
																	<span>Delete</span>
																</DropdownMenuItem>
															</div>
														</DropdownMenuContent>
													</DropdownMenu>
												</td>
												<td class="pl-1 relative w-8 whitespace-nowrap py-3.5 pl-3 text-right text-sm font-normal">
													<span class="absolute inset-y-0 right-0 flex w-6 items-center justify-center pr-2">
														<svg
															xmlns="http://www.w3.org/2000/svg"
															viewBox="0 0 20 20"
															fill="currentColor"
															aria-hidden="true"
															class="h-6 w-6 text-gray-300 transition-all duration-300 group-hover:text-gray-700 dark:text-gray-700 group-hover:dark:text-gray-200"
														>
															<path
																fill-rule="evenodd"
																d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
																clip-rule="evenodd"
															/>
														</svg>
													</span>
												</td>
												<!--												<div class="inline-flex w-max cursor-pointer"> -->
												<!--													<button class="absolute inset-y-0 left-0 right-16 z-10 w-[90%]" /> -->
												<!--													<button class="absolute inset-y-0 right-0 z-10 w-8" /> -->
												<!--													<button class="absolute inset-y-0 left-0 right-16 z-10 w-12" /> -->
												<!--													&lt;!&ndash;&ndash;&gt; -->
												<!--												</div> -->
											</tr>
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="h-12 w-full" />
			</div>
		</div>
		<Modal
			v-model="deleteTunnelConfirmOpen"
			title="Please confirm!"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDeleteTunnel"
		>
			<div class="absolute inset-0 flex h-full min-h-[200px] flex-col items-center justify-center p-8 text-center">
				<div>Do you want to close this tunnel?</div>
			</div>
		</Modal>
		<Modal
			v-model="deleteStoredTunnelConfirmOpen"
			title="Please confirm!"
			ok-text="Delete"
			cancel-text="Cancel"
			:show-cancel="true"
			@ok="confirmDeleteStoredTunnel"
		>
			<div class="absolute inset-0 flex h-full min-h-[200px] flex-col items-center justify-center p-8 text-center">
				<div>Do you want to delete the stored tunnel "{{ activeStoredTunnel?.name }}"?</div>
			</div>
		</Modal>
	</div>
</template>

<script setup>
import { useTimeAgo, useClipboard } from '@vueuse/core';

const props = defineProps({
	id: {
		type: String,
		required: true,
	},
});

defineEmits(['addtunnel']);
const { $api } = useNuxtApp();
const snackbar = useSnackbar();
const { copy } = useClipboard();

const { data: tunnels, refresh: refreshTunnels } = useAsyncData(`tunnels_${props.id}`, () => $api.clients.tunnels(props.id));
const { data: storedTuns, refresh: refreshStoredTunnels } = useAsyncData(`stored_tunnels_${props.id}`, () => $api.clients.storedTunnels(props.id));

const deleteTunnelConfirmOpen = ref(false);
const activeTunnel = ref(null);
const deleteStoredTunnelConfirmOpen = ref(false);
const activeStoredTunnel = ref(null);

const triggerDeleteTunnel = (tunnel) => {
	activeTunnel.value = tunnel;
	deleteTunnelConfirmOpen.value = true;
};

const confirmDeleteTunnel = async () => {
	if (!activeTunnel.value) return;
	await $api.clients.deleteTunnel(props.id, activeTunnel.value.id);
	snackbar.add({ type: 'success', text: 'Tunnel closed' });
	deleteTunnelConfirmOpen.value = false;
	await refreshTunnels();
};

const triggerDeleteStoredTunnel = (tun) => {
	activeStoredTunnel.value = tun;
	deleteStoredTunnelConfirmOpen.value = true;
};

const confirmDeleteStoredTunnel = async () => {
	if (!activeStoredTunnel.value) return;
	await $api.clients.deleteStoredTunnel(props.id, activeStoredTunnel.value.id);
	snackbar.add({ type: 'success', text: 'Stored tunnel deleted' });
	deleteStoredTunnelConfirmOpen.value = false;
	await refreshStoredTunnels();
};
</script>
